/**
 * @author Eero Kuusela
 */
 (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'Handlebars', 'watch', 'helpers'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery', 'Handlebars', 'watch', 'helpers'));
    } else {
        // Browser globals (root is window)
        root.jQueryHelpers = factory(root.jQuery, root.Handlebars, root.watch, root.helpers);
    }
}(this, function($, Handlebars, watch, helpers) {
    'use strict';
    
    /**
     * Block-helper for getting access to a jquery wrapped element from a template after it's added to the DOM.
     */
    function jqHelper(fn, options) {
        return helpers.elementHelper.call(this, function(element) { fn($(element)); }, options);
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
    
}));