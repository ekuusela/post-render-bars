/**
 * Defines a function that watches for a piece of HTML to get added to the document.
 * 
 * Uses MutationObserver, see webcomponents-lite for a polyfill.
 *
 * @author Eero Kuusela
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.watch = factory();
  }
}(this, function () {
    'use strict';

    var id = 0;
    var attributeName = 'data-watch-id';

    /**
     * Starts watching the body for addition of a Node described by the given HTML string.
     *
     * Modifies the HTML to have an identifying attribute and returns that. When that attribute is encountered, the callback is invoked.
     *
     * The callback gets a single argument: the first element defined in the template.
     */
    function forHtml(html, callback) {
        html = html.trim();
        var index = Math.min(html.indexOf(' '), html.indexOf('>'));
        if (index === -1) {
            return html;
        }

        id += 1;
        html = html.slice(0, index) + ' ' + attributeName + '="' + id + '"' + html.slice(index);

        var onMutate = function(id) {
            return function() {
                var elements = document.querySelectorAll('[' + attributeName + '="' + id + '"]');
                var element;
                if (elements.length > 0) {
                        observer.disconnect();
                    element = elements[0];
                    element.removeAttribute(attributeName);
                    callback(element);
                    }
                };
        };

        var observer = new MutationObserver(onMutate(id));
        observer.observe(document.body, {childList: true, subtree: true});
        return html;
    }

    return {
        forHtml: forHtml,
    };
}));