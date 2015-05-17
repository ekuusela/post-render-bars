# Post-render Utility for Handlebars
 
Use `postHandlebars` to trigger a function when a template is rendered and the `watch` module to get access to the node that gets created when the HTML is added to the document.

This makes it possible to, for example, attach event handlers directly to templates and partials without knowing where in the DOM templates get added or in which templates partials will be included. Effectively eliminates the need for the event delegate pattern and lowers coupling between the views.

See `example.html` for usage examples.

#watch.js

Defines a function that watches for a piece of HTML to get added to the document.
 
Uses MutationObserver, see webcomponents-lite for a polyfill.

#postHandlebars.js

Module for triggering functions after Handlebars templates or partials are rendered.