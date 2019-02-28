import hbs from '@glimmer/inline-precompile';
import { render, setupRenderingTest } from '@glimmer/test-helpers';

const { module, test } = QUnit;

module('Component: SearchWithModifiers', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await render(hbs`<SearchWithModifiers />`);
    assert.ok(this.containerElement.querySelector('div.search'));
    assert.ok(this.containerElement.querySelector('div.search-box'), 'Expected search box');
  });
});
