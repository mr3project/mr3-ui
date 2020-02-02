import graphView from '../../../utils/graph-view';
import { module, test } from 'qunit';

module('Unit | Utility | graph view');

test('Basic creation test', function(assert) {

  assert.ok(graphView);
  assert.ok(graphView.create);
  assert.ok(graphView.fitGraph);
  assert.ok(graphView.additionalDisplay);
  assert.ok(graphView.toggleLayouts);

});
