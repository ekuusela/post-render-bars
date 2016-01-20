# Post-render utilities for Handlebars

Main features:

- The `renderer` helper enables one way data binding to templates and partials.

    Wrap your function with `createRenderer(getHtmlContentFn)` and call it to update rendered output. You don't even have to wait for the template to be inserted to the DOM.

- The `registerActivator` function creates a callback triggered when a template or a partial is inserted to the DOM.

    You'll get access to the DOM node and this makes it possible to, for example, attach event handlers directly to templates and partials without knowing where in the DOM they end up or in which templates partials will be included. Effectively eliminates the need for the event delegate pattern and lowers coupling between the views.

- The `registerPostRender(templateName, fn)` function creates a callback triggered when a template or a partial is rendered to a string.

Dependencies:

Uses MutationObserver, see webcomponents-lite for a polyfill.

**See [example.html for a demo](http://ekuusela.github.io/post-render-bars/example/example.html) and usage examples.** There's also a [JSFiddle](https://jsfiddle.net/ekuusela/suurxkot/) if you wish to quickly try it yourself.

Here's a shortened example for using the renderer helper:

template:

    <p>current time: {{#renderer time}}<span>waiting</span>{{/renderer}}</p>

js:

     var timeRenderer = postHandlebars.createRenderer(function() { return new Date(); });
     timeRenderer(); // template will be updated immediately when it's appended to the document
     container.innerHTML = template({time: timeRenderer});
     setInterval(timeRenderer, 1000); // this causes the displayed time to be updated every second

##postHandlebars.js

Module for triggering functions after Handlebars templates or partials are rendered or added to the document. Also defines helpers that utilize watch.js and post rendering functions.

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
