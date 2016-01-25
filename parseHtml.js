/**
 * Function for parsing html strings to DOM nodes. Borrows heavily from jQuery.
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
        module.exports = factory(require());
    } else {
        // Browser globals (root is window)
        root.parseHtml = factory();
    }
}(this, function() {
    'use strict';

    var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi;
    var rtagName = /<([\w:]+)/;

    var wrapMap = {
        option: [ 1, '<select multiple="multiple">', '</select>' ],
        thead: [ 1, '<table>', '</table>' ],
        col: [ 2, '<table><colgroup>', '</colgroup></table>' ],
        tr: [ 2, '<table><tbody>', '</tbody></table>' ],
        td: [ 3, '<table><tbody><tr>', '</tr></tbody></table>' ],

        _default: [ 0, '', '' ]
    };

    wrapMap.optgroup = wrapMap.option;
    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;

    /**
     * Returns an array of nodes.
     */
    var parseHtml = function(str) {
        if (str === '') {
            return [document.createTextNode('')];
        }
        var fragment = document.createDocumentFragment();
        var tempParent = fragment.appendChild(document.createElement('div'));

        var tagName = ( rtagName.exec( str ) || ['', ''] )[1].toLowerCase();
        wrap = wrapMap[ tagName ] || wrapMap._default;
        tempParent.innerHTML = wrap[1] + str.replace( rxhtmlTag, '<$1></$2>' ) + wrap[2];

        // Descend through wrappers to the right content
        var depth = wrap[0];
        while ( depth-- ) {
            tempParent = tempParent.lastChild;
        }
        var result = Array.prototype.slice.call(tempParent.childNodes);

        // Ensure the created nodes are orphaned
        fragment.firstChild.textContent = '';

        return result;
    };

    return parseHtml;
}));