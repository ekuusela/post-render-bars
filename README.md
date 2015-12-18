# Post-render Utility for Handlebars
 
Use `postHandlebars` to trigger a function when a template is rendered and the `watch` module to get access to the node that gets created when the HTML is added to the document.

This makes it possible to, for example, attach event handlers directly to templates and partials without knowing where in the DOM templates get added or in which templates partials will be included. Effectively eliminates the need for the event delegate pattern and lowers coupling between the views.

**See [example.html for a demo](http://ekuusela.github.io/post-render-bars/example/example.html) and usage examples.**

##watch.js

Defines a function that watches for a piece of HTML to get added to the document.
 
Uses MutationObserver, see webcomponents-lite for a polyfill.
    
    var clickHandler = function() { console.log('clicked', this); };
    var watchedHtml = watch.forHtml('<button>click me</button>', function(element) {
        element.addEventListener('click', clickHandler);
    });
    document.body.innerHTML = watchedHtml; // results in a button with the click handler defined above

##postHandlebars.js

Module for triggering functions after Handlebars templates or partials are rendered.


    // assume we have a pre-compiled template called 'content'
    postHandlebars.registerPostRender('content', function(str) { return str.toUpperCase(); });
    console.log(Handlebars.templates['content']({body: 'here is the content'})); // outputs the rendered template in all capitals
