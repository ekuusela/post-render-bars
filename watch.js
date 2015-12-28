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

    var idCounter = 0;
    var attributeName = 'data-watch-id';

    /**
     * Starts watching the body for addition of a Node described by the given HTML string.
     *
     * Modifies the first element in the HTML string to have a class attribute or appends a new class if it already has one.
     *
     * When an element with the class is encountered, the class list is restored/removed and the callback is invoked.
     *
     * Returns the modified HTML, which is the one that should be added to the document for the callback to trigger.
     *
     * The callback gets the first element as an argument.
     */
    function forHtml(html, callback) {
        idCounter += 1;
        var className = '_watched_' + idCounter;
        var result = appendToClass(html, className);
        if (!result) { return html; }
        html = result;

        var onMutate = function() {
            return function() {
                var elements = document.getElementsByClassName(className);
                if (elements.length > 0) {
                    observer.disconnect();
                    for (var i = elements.length - 1; i >= 0; i--) {
                        var element = elements[i];
                        removeClass(element, className);
                        callback(element);
                    }
                }
            };
        };

        var observer = new MutationObserver(onMutate());
        observer.observe(document.body, {childList: true, subtree: true});
        return html;
    }

    function appendToClass(html, className) {
        html = html.trim();
        var attributeStr = ' class="';
        var attributeIndex = html.indexOf(attributeStr);
        var closingIndex = html.indexOf('>');
        if (closingIndex === -1) { return; }

        var hasClass = attributeIndex > -1 && attributeIndex < closingIndex;
        if (hasClass) {
            var classIndex = html.indexOf('"', attributeIndex + attributeStr.length);
            html = insert(html, classIndex, ' ' + className);
        } else {
            var spaceIndex = html.indexOf(' ');
            var newClassIndex;
            if (spaceIndex === -1) {
                newClassIndex = closingIndex;
            } else {
                newClassIndex = Math.min(closingIndex, spaceIndex);
            }
            html = insert(html, newClassIndex, ' class="' + className +'"');
        }
        return html;
    }

    function removeClass(element, className) {
        element.classList.remove(className);
        if (element.classList.length === 0) {
            element.removeAttribute('class');
        }
    }

    function insert(str, index, item) {
        return str.slice(0, index) + item + str.slice(index);
    }

    return {
        forHtml: forHtml,
    };
}));