import { ComponentManager, setPropertyDidChange } from '@glimmer/component';
import initializeCustomElements from '@glimmer/web-component';
import 'babel-polyfill/browser';
import App from './main';

const app = new App();
const containerElement = document.getElementById('search_with_modifiers');

setPropertyDidChange(() => {
  app.scheduleRerender();
});

app.registerInitializer({
  initialize(registry) {
    registry.register(`component-manager:/${app.rootName}/component-managers/main`, ComponentManager);
  }
});

app.renderComponent('SearchWithModifiers', containerElement, null);

app.boot().then(() => {
  initializeCustomElements(app, { 'search-with-modifiers': 'SearchWithModifiers' });
});
