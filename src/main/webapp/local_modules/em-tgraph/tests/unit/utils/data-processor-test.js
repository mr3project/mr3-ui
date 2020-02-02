import dataProcessor from '../../../utils/data-processor';
import { module, test } from 'qunit';

module('Unit | Utility | data processor');

test('Basic creation test', function(assert) {

  assert.ok(dataProcessor);
  assert.ok(dataProcessor.types);
  assert.ok(dataProcessor.graphifyData);

});
