/**
 * Module for triggering functions after Handlebars templates or partials are rendered.
 * 
 * @author Eero Kuusela
 */
 (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['handlebars', 'watch'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('handlebars', 'watch'));
    } else {
        // Browser globals (root is window)
        root.postHandlebars = factory(root.Handlebars, root.watch);
    }
}(this, function (Handlebars, watch) {

    /**
     * List of objects that contain (or will contain) compiled Handlebars templates with template names as keys. 
     */
    var postRenderTargets = [];
    
    /**
     * Registered functions with template names as keys.
     */
    var postRenderFns = {};
    
    /**
     * Registers the given object as a container of compiled templates that we wish to target with the post render functions.
     * 
     * When registering post render functions they are registered only for templates that have been included with this function.
     */
    function applyPostRendersIn(templates) {
        postRenderTargets.push(templates);
    }
    
    /**
     * Registers a function to be executed after the given template has been rendered to a string.
     *
     * The callback receives the rendered string as an argument.
     */
    function registerPostRender(templateName, fn) {
        var register = function(targets) {
            Object.defineProperty(targets, '_' + templateName, {
                value: targets[templateName], writable: true, configurable: true
            });
            Object.defineProperty(targets, templateName, {
                get: function() { return this['_' + templateName]; },
                set: function(newTemplate) {
                    var original = newTemplate;
                    this['_' + templateName] = appendPostRenderApplyFn(newTemplate, templateName);
                }
            });
            targets[templateName] = targets[templateName]; // trigger the setter once
        };
        if (postRenderTargets.length === 0) {
            setDefaultTargets();
        }
        postRenderTargets.forEach(register)
        postRenderFns[templateName] = fn;
    }
    
    /**
     * Appends a function to a compiled template.
     */
    function appendPostRenderFn(compiledTemplate, fn) {
        var original = compiledTemplate;
        return function() { 
            var result = original.apply(this, arguments);
            result = fn(result);
            return result;
        };
    }
    
    /**
     * Creates and returns a renderer function to be used together with the renderer helper.
     *
     * Pass in the renderer to a Handlebars template and use it as an argument for the renderer helper.
     * Invoking the renderer then causes the element contents to be updated with the return value of the given callback.
     *
     * The renderer can be invoked multiple times before or after the template has been added to the DOM.
     *
     * @param {function(): string} getHtmlContentFn
     * @return {function()} renderer
     */
    function createRenderer(getHtmlContentFn) {
        var renderer = function() {
            var html = getHtmlContentFn();
            if (renderer.node) {
                doRender(html);
            } else {
                renderer.earlyRenderedHtml = html;
            }
        };
        var doRender = function(html) {
            renderer.node.innerHTML = html;
        };
        Object.defineProperty(renderer, '_node', {
            writable: true
        });
        Object.defineProperty(renderer, 'node', {
            get: function() { return this._node; },
            set: function(value) {
                this._node = value;
                if (this.earlyRenderedHtml) {
                    doRender(this.earlyRenderedHtml);
                }
            }
        });
        return renderer;
    }

    /**
     * Helper for creating HTML nodes that can have their content updated by executing a callback.
     *
     * Can be used as a regular or a block helper.
     * In block mode, the contents of the first element in the block will be replaced with the renderer function's return value whenever that renderer gets invoked.
     * When used as regular helper, or if the block contents are omitted, behaves as if used in block mode with the content set to '<div></div>'.
     *
     * Note: using this helper makes sense only for HTML content intended to be viewed in a DOM.
     *
     * @param {function(): string} renderer a function created by the createRenderer function
     */
    function rendererHelper(renderer, options) {
        if (typeof renderer !== 'function') { throw 'Expected a function as the first argument'; }
        var placeholderHtml;
        if (options.fn) {
            placeholderHtml = options.fn(this);
        }
        if (!placeholderHtml) {
            placeholderHtml = '<div></div>';
        }

        return new Handlebars.SafeString(watch.forHtml(placeholderHtml, function(node) {
            renderer.node = node;
        }));
    }

    Handlebars.registerHelper('renderer', rendererHelper);
    
    /**
     * Registers the function argument as a callback to be invoked after the template HTML has been added to DOM.
     *
     * The callback gets a single argument: the first element defined in the template
     */
    var registerActivator = function(templateName, fn) {
        var activator = function(html) {
            return watch.forHtml(html, fn);
        };
        registerPostRender(templateName, activator);
    }
    
    function setDefaultTargets() {
        if (Handlebars) {
            if (Handlebars.templates) {
                applyPostRendersIn(Handlebars.templates);
            }   
            if (Handlebars.templates !== Handlebars.partials) {
                applyPostRendersIn(Handlebars.partials);
            }
        }
    }
    
    /**
     * Appends a function to a compiled template that applies any registered post render functions when the template is rendered.
     */
    function appendPostRenderApplyFn(compiledTemplate, templateName) {
        return appendPostRenderFn(compiledTemplate, function(result) { return applyPostRender(templateName, result); });
        
    }

    /**
     * Applies any registered post render functions to the given string.
     */
    function applyPostRender(templateName, renderedString) {
        if (typeof postRenderFns[templateName] === 'function') {
            return postRenderFns[templateName](renderedString);
        }
        return renderedString;
    }
        
    return {
        createRenderer:createRenderer,
        registerActivator:registerActivator,
        registerPostRender:registerPostRender,
        appendPostRenderFn:appendPostRenderFn,
        applyPostRendersIn:applyPostRendersIn
    };
}));