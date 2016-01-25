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
        define(['parseHtml'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('parseHtml'));
    } else {
        // Browser globals (root is window)
        root.watch = factory(root.parseHtml);
  }
}(this, function(parseHtml) {
    'use strict';

    var idCounter = 0;
    var idPrefix = '_watched_';
    var idSuffix = '_';
    var watchIdentifierRegExp = new RegExp(idPrefix + '[0-9]+' + idSuffix, 'g');
    var observers = {};
    var interruptedCallbacks = {};

    /**
     * Starts watching the body for addition of Nodes described by the given HTML string.
     *
     * Modifies the nodes in the HTML string to be identifiably by a class or prepended piece of text.
     *
     * When an element with the identifier is encountered, the identifier is removed and the callback is invoked.
     *
     * Returns the modified HTML, which is the one that should be added to the document for the callback to trigger.
     *
     * The callback gets the elements as arguments.
     */
    function forHtml(html, callback, cancelCallback) {
        idCounter += 1;
        var identifier = idPrefix + idCounter + idSuffix;
        html = html.trim();
        var nodes = parseHtml(html);

        nodes.forEach(function(node) {
            addIdentifier(node, identifier);
        });
        var html = nodesToStr(nodes);

        var onMutate = function() {
            return function(records) {
                var elements = allAddedNodes(records).filter(function(node) {
                    if (node.nodeType === 3) {
                        // TODO detect text in the middle of the value and split node to multiple text nodes
                        return node.nodeValue.substr(0, identifier.length) === identifier;
                    } else {
                        return node.classList.contains(identifier);
                    }
                });

                if (elements.length > 0) {
                    doStopWatching(identifier);
                    for (var i = elements.length - 1; i >= 0; i--) {
                        var element = elements[i];
                        removeIdentifier(element, identifier);
                    }
                    callback.apply(null, elements);
                }
            };
        };

        var observer = new MutationObserver(onMutate());
        observer.observe(document.body, {childList: true, subtree: true});
        observers[identifier] = observer;

        if (typeof cancelCallback === 'function') {
            onCancel(identifier, cancelCallback);
        }

        return html;
    }

    /**
     * Stop watching and trigger any interrupted callbacks.
     */
    function cancel(identifier) {
        if (observers[identifier]) {
            if (interruptedCallbacks[identifier]) {
                interruptedCallbacks[identifier].forEach(function(fn) {
                    fn();
                });
            }
            doStopWatching(identifier);
        }
    }

    function onCancel(identifier, fn) {
        if (!interruptedCallbacks[identifier]) {
            interruptedCallbacks[identifier] = [];
        }
        interruptedCallbacks[identifier].push(fn);
    }

    /**
     * Stops watching for changes for the given identifier. Deletes references related to it.
     */
    function doStopWatching(identifier) {
        delete interruptedCallbacks[identifier];
        observers[identifier].disconnect();
        delete observers[identifier];
    }

    function allAddedNodes(records) {
        var nodes = [];
        var addWithChildren = function(node) {
            nodes.push(node);
            Array.prototype.forEach.call(node.childNodes, addWithChildren);
        };
        records.forEach(function(record) {
            Array.prototype.forEach.call(record.addedNodes, addWithChildren);
        });
        return nodes;
    }

    function addIdentifier(node, identifier) {
        if (node.nodeType === 3) {
            node.nodeValue = identifier + node.nodeValue;
        } else {
            node.classList.add(identifier);
        }
    }

    function removeIdentifier(node, identifier) {
        if (node.nodeType === 3) {
            node.nodeValue = node.nodeValue.substr((identifier).length);
        } else {
            node.classList.remove(identifier);
            if (node.classList.length === 0) {
                node.removeAttribute('class');
            }
        }
    }

    function getElementWatchClasses(element) {
        return Array.prototype.filter.call(element.classList, function(name) {
            return name.match(watchIdentifierRegExp)
        });
    }

    /**
     * Converts the given list of nodes to a string.
     */
    function nodesToStr(nodes) {
        return nodes.reduce(function(prev, node) {
            return prev + (node.nodeType === 3 ? node.nodeValue : node.outerHTML);
        }, '');
    }

    function getIdentifiersIn(str) {
        if (typeof str !== 'string') {
            return [];
        }
        var matches = str.match(watchIdentifierRegExp);
        if (!matches) {
            return [];
        }
        var unique = matches.filter(function(item, i){ return matches.indexOf(item) === i; });
        return unique;
    }

    return {
        forHtml: forHtml,
        cancel:cancel,
        getElementWatchClasses: getElementWatchClasses,
        getIdentifiersIn: getIdentifiersIn,
        onCancel: onCancel
    };
}));