# Post-render utilities for Handlebars

Main features:

- The `renderer` helper enables one way data binding to templates and partials.
 
    Wrap your function with `createRenderer` and call it to update rendered output. You don't even have to wait for the template to be inserted to the DOM.

- The `registerActivator` function creates a callback triggered when template is inserted to the DOM.

    You'll get access to the DOM node and this makes it possible to, for example, attach event handlers directly to templates and partials without knowing where in the DOM they end up or in which templates partials will be included. Effectively eliminates the need for the event delegate pattern and lowers coupling between the views.
    
- The `registerPostRender` function creates a callback triggered when a template is rendered to a string.
 
Dependencies:

Uses MutationObserver, see webcomponents-lite for a polyfill.

**See [example.html for a demo](http://ekuusela.github.io/post-render-bars/example/example.html) and usage examples.**

##postHandlebars.js

Module for triggering functions after Handlebars templates or partials are rendered or added to the document.

    // assume we have a pre-compiled template called 'content'
    postHandlebars.registerPostRender('content', function(str) { return str.toUpperCase(); });
    console.log(Handlebars.templates['content']({body: 'here is the content'})); // outputs the rendered template in all capitals

##watch.js

Defines a function that watches for a piece of HTML to get added to the document.
    
    var clickHandler = function() { console.log('clicked', this); };
    var watchedHtml = watch.forHtml('<button>click me</button>', function(element) {
        element.addEventListener('click', clickHandler);
    });
    document.body.innerHTML = watchedHtml; // results in a button with the click handler defined above
