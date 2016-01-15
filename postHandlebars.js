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
    'use strict';

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

    /**
     * Registers the function argument as a callback to be invoked after the template HTML has been added to DOM.
     *
     * The callback gets a single argument: the first element defined in the template
     */
    function registerActivator(templateName, fn) {
        var activator = function(html) {
            return watch.forHtml(html, fn);
        };
        registerPostRender(templateName, activator);
    }

    /**
     * Creates and returns a renderer function to be used together with the renderer helper.
     *
     * Pass in the renderer to a Handlebars template and use it as an argument for the renderer helper.
     * Invoking the renderer then causes the element contents to be updated with the return value of the given callback.
     *
     * The renderer can be invoked multiple times before or after the template has been added to the DOM.
     *
     * The callback should return a string of HTML (or something castable to a string). The string can re-define the entire element defined in the block
     * or contents for that element.
     *
     * @param {function(): string} [getHtmlContentFn] the renderer function, defaults to a function that takes in and returns a single argument
     * @return {function()} renderer
     */
    function createRenderer(getHtmlContentFn) {
        if (getHtmlContentFn === undefined) {
            getHtmlContentFn = function(content) { return content; };
        }
        var doRender = function(html, target) {
            html = html.trim();
            var parsed = parseHtml(html); // FIXME use watch.parseHtml
            var newNodesMatchTarget = (target.nodes.length === parsed.length) && target.nodes.every(function(node, i) {
                return node.nodeType === parsed[i].nodeType;
            });
            if (newNodesMatchTarget) {
                target.nodes.forEach(function(node, i) {
                    if (node.nodeType === 3) {
                        node.nodeValue = parsed[i].nodeValue;
                    } else {
                        replaceContentAndAttributes(node, parsed[i]);
                    }
                });
            } else {
                var firstNode = target.nodes[0];
                if (firstNode.nodeType === 3) {
                    firstNode.nodeValue = html;
                } else {
                    firstNode.innerHTML = html;
                }
            }
        };
        var targets = [];
        var renderer = function() {
            var argsForRenderer = arguments;
            targets.forEach(function(target) {
                var args = target.defaultArgs.slice();
                var i;
                for (i = 0; i < argsForRenderer.length; i++) {
                    args[i] = argsForRenderer[i];
                }
                args.push(target.options);

                var html = '' + getHtmlContentFn.apply(target.context, args);
                if (target.nodes) {
                    doRender(html, target);
                } else {
                    watch.getIdentifiersIn(target.earlyRenderedHtml).forEach(watch.cancel);
                    target.earlyRenderedHtml = html;
                }
            });

        };
        renderer.getNewTarget = function(options, context) {
            var target = {
                options: options,
                context: context,
                earlyRenderedHtml: undefined,
                defaultArgs: []
            };
            var nodes;
            Object.defineProperty(target, 'nodes', {
                set: function(newNodes) {
                    nodes = newNodes;
                    if (target.earlyRenderedHtml) {
                        doRender(target.earlyRenderedHtml, target);
                        target.earlyRenderedHtml = undefined;
                    }
                },
                get: function() {
                    return nodes;
                }
            });
            targets.push(target);
            return target;
        };
        renderer.removeTarget = function(target) {
            var i = targets.indexOf(target);
            if (i > -1) {
                targets.splice(i, 1);
            }
        };
        return renderer;
    }

    /**
     * We add a self reference to all contexts to keep a reference to the original context which handlebars loses if hash arguments are provided.
     */
    var origTemplate = Handlebars.VM.template;
    Handlebars.VM.template = function() {
        var result = origTemplate.apply(this, arguments);
        return function(context) {
            if (!context.hasOwnProperty('_self')) {
                Object.defineProperty(context, '_self', {
                    value: context,
                    enumerable: true // to make Handlebars.Utils.extend add this to the context that gets extended with hash values
                    });
            }

            return result.apply(this, arguments);
        };
    };

    /**
     * Helper for creating HTML nodes that can have their content updated by executing a callback.
     *
     * Can be used as a regular or a block helper. The block must define a single HTML element. FIXME outdated
     * When used as a regular helper, or if the block contents are omitted, behaves as if used in block mode with the content set to '<div></div>'.
     *
     * Note: using this helper makes sense only for HTML content intended to be viewed in a DOM.
     *
     * @param {function(): string} renderer a function created by the createRenderer function
     */
    function rendererHelper(renderer/*[, args...], options*/) {
        if (typeof renderer !== 'function') { throw 'Expected a function as the first argument'; }

        var options = arguments[arguments.length - 1];
        var target = renderer.getNewTarget(options, this._self || this);
        if (arguments.length > 2) {
            target.defaultArgs = Array.prototype.slice.call(arguments, 1, arguments.length - 1);
        }

        var blockHtml;
        if (options.fn) {
            // block mode
            blockHtml = options.fn(this);
            if (blockHtml instanceof Handlebars.SafeString) {
                blockHtml = blockHtml.string;
            }
        } else {
            blockHtml = '<div></div>';
        }

        return new Handlebars.SafeString(watch.forHtml(blockHtml, function() {
            target.nodes = Array.prototype.slice.call(arguments);
        }, function() {
            renderer.removeTarget(target);
        }));
    }
    Handlebars.registerHelper('renderer', rendererHelper);

    function getModelRenderer(context) {
        var fn = function(key, value) {
            var valuePassedIn = arguments.length > 1;
            var matchingProps = [];
            if (key === undefined) {
                matchingProps = Object.keys(fn);
            } else {
                matchingProps = [key];
            }
            matchingProps.forEach(function(key) {
                if (valuePassedIn) {
                    setProperty(context, key, value);
                }
                if (fn.hasOwnProperty(key) && typeof fn[key] === 'function') {
                    fn[key]();
                }
            });
        };
        return fn;
    }

    /**
     * Helper to be used together with the getModelRenderer. The context must contain the modelRenderer function
     * which then can be used to re-render any values from the context.
     */
    function modelHelper(key, options) {
        if (typeof key !== 'string') { throw 'Expected a string as the first argument for model helper'; }
        var rendererKeyInContext = 'model';

        var modelRenderer = options.data.root[rendererKeyInContext];
        if (modelRenderer === undefined) {
            options.data.root[rendererKeyInContext] = getModelRenderer(this);
            modelRenderer = options.data.root[rendererKeyInContext];
        } else {
            if (typeof modelRenderer !== 'function') {
                throw 'Naming conflict, context already has something defined with the key "' + rendererKeyInContext + '".';
            }
        }
        if (modelRenderer[key] === undefined) {
            modelRenderer[key] = createRenderer(function() {
                var options = arguments[arguments.length - 1];
                var context = this;
                if (options.fn) {
                    return options.fn(context);
                } else {
                    return readProperty(options.data.root, key);
                }
            });
        }

        var result = rendererHelper.call(this, modelRenderer[key], options);
        modelRenderer.call(null, key);
        return result;
    }
    Handlebars.registerHelper('model', modelHelper);

    /**
     * Block-helper for getting access to an element from a template after it's added to the DOM.
     */
    function elementHelper(fn, options) {
        if (typeof fn !== 'function') {
            console.warn('No function provided for element helper.');
            return arguments[0].fn(this); // no op
        }

        var htmlToInit = options.fn(this);
        if (htmlToInit instanceof Handlebars.SafeString) {
            htmlToInit = htmlToInit.string;
        }
        htmlToInit = htmlToInit.trim();
        return new Handlebars.SafeString(watch.forHtml(htmlToInit, function(element) {
            fn(element);
        }));
    }
    Handlebars.registerHelper('element', elementHelper);

    /**
     * Block-helper for getting access to a jquery wrapped element from a template after it's added to the DOM.
     */
    function jqHelper(fn, options) {
        return elementHelper.call(this, function(element) { fn($(element)); }, options);
    }
    Handlebars.registerHelper('jq', jqHelper);

    /**
     * Block-helper for invoking a function on jquery wrapped element from a template after it's added to the DOM.
     *
     * @param {string} fnName name of the jquery function to call
     * @param {string} [argJson] optional JSON string that is parsed to an argument for the function.
     */
    function jqinitHelper(fnName/*[, argJson]*/) {
        var options;
        var argJson;
        var initArg;
        if (arguments.length > 2) {
            // fnName, argJson, options
            argJson = arguments[1];
            initArg = JSON.parse(argJson);
            options = arguments[2];
        } else {
            // fnName, options
            options = arguments[1];
        }
        var htmlToInit = options.fn(this).trim();
        return new Handlebars.SafeString(watch.forHtml(htmlToInit, function(element) {
            if (initArg) {
                $(element)[fnName](initArg);
            } else {
                $(element)[fnName]();
            }

        }));
    }
    Handlebars.registerHelper('jqinit', jqinitHelper);

    /**
     * Reads property from object. Supports reading nested properties with dot or bracket notation.
     */
    function readProperty(object, property) {
        var value = object;
        property = property.replace(/\[('|")?|('|")?\]/g, '.');
        if (property.substring(property.length - 1) === '.') {
            property = property.slice(0, property.length - 1);
        }
        property.split('.').forEach(function(name) {
            value = value[name];
        });
        return value;
    }

    function setProperty(object, property, newValue) {
        var value = object;
        property = property.replace(/\[('|")?|('|")?\]/g, '.');
        if (property.substring(property.length - 1) === '.') {
            property = property.slice(0, property.length - 1);
        }
        var parts = property.split('.');
        for (var i = 0; i < parts.length - 1; i++) {
            value = value[parts[i]];
            if (value === undefined) {
                return;
            }
        }
        value[parts[parts.length - 1]] = newValue;
    }

    function copyProperty(target, source, property) {
        property = property.replace(/\[('|")?|('|")?\]/g, '.');
        if (property.substring(property.length - 1) === '.') {
            property = property.slice(0, property.length - 1);
        }
        var parts = property.split('.');
        for (var i = 0; i < parts.length - 1; i++) {
            source = source[parts[i]];
            if (target[parts[i]] === undefined) {
                target[parts[i]] = source;
            }
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = source[parts[parts.length - 1]];
    }

    function getElementDefinedByHtmlIfAny(htmlString, element) {
        if (stringDefinesAnElement(htmlString, element)) {
            var parsed = parseHtml(htmlString);
            if (parsed.length === 1) {
                return parsed[0];
            }
        }
    }

    function stringDefinesAnElement(htmlString, element) {
        return htmlString.trim().toLowerCase().startsWith('<' + element.tagName.toLowerCase());
    }

    function replaceContentAndAttributes(target, source) {
        var preservedClasses = watch.getElementWatchClasses(target);
        target.innerHTML = source.innerHTML;
        setAttributes(target, source);
        preservedClasses.forEach(function(name) {
            if (!target.classList.contains(name)) {
                target.classList.add(name);
            }
        });
    }

    /**
     * Sets attributes of element target to match source
     */
    function setAttributes(target, source) {
        var i, a;
        var oldAttributeNames = [];
        for (i = 0; i < target.attributes.length; i++) {
            a = target.attributes[i];
            oldAttributeNames.push(a.name);
        }
        for (i = 0; i < oldAttributeNames.length; i++) {
            target.removeAttribute(oldAttributeNames[i]);
        }
        for (i = 0; i < source.attributes.length; i++) {
            a = source.attributes[i];
            target.setAttribute(a.name, a.value);
        }
    }

    //FIXME use the one used by watch.js
    function parseHtml(str) {
        var tmp = document.implementation.createHTMLDocument();
        tmp.body.innerHTML = str;
        return tmp.body.childNodes;
    }

    return {
        createRenderer:createRenderer,
        registerActivator:registerActivator,
        getModelRenderer:getModelRenderer,
        registerPostRender:registerPostRender,
        appendPostRenderFn:appendPostRenderFn,
        applyPostRendersIn:applyPostRendersIn
    };
}));