import tip from '../../../utils/tip';
import { module, test } from 'qunit';

module('Unit | Utility | tip');

test('Basic creation test', function(assert) {

  assert.ok(tip);
  assert.ok(tip.init);
  assert.ok(tip.show);
  assert.ok(tip.reposition);
  assert.ok(tip.hide);

});
