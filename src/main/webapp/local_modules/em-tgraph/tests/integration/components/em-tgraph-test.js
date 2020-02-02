import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('em-tgraph', 'Integration | Component | em tgraph', {
  integration: true
});

test('Basic failure test', function(assert) {

  this.set("data", []);
  this.render(hbs`{{em-tgraph data=data}}`);

  assert.equal(this.$().text().trim(), 'Rendering failed! Vertices not found!');

  // Template block usage:" + EOL +
  this.render(hbs`
    {{#em-tgraph data=data}}
      template block text
    {{/em-tgraph}}
  `);

  assert.equal(this.$().text().trim(), 'Rendering failed! Vertices not found!');
});
