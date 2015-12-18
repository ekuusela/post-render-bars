/**
 * Module for triggering functions after Handlebars templates or partials are rendered.
 * 
 * @author Eero Kuusela
 */
 (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['handlebars'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('handlebars'));
    } else {
        // Browser globals (root is window)
        root.postHandlebars = factory(root.Handlebars);
    }
}(this, function (Handlebars) {

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
    
    return {
        applyPostRendersIn:applyPostRendersIn,
        registerPostRender:registerPostRender,
        appendPostRenderFn:appendPostRenderFn
    };
}));