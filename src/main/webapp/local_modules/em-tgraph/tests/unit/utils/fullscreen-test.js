import fullscreen from '../../../utils/fullscreen';
import { module, test } from 'qunit';

module('Unit | Utility | fullscreen');

test('Basic creation test', function(assert) {

  assert.ok(fullscreen);
  assert.ok(fullscreen.inFullscreenMode);
  assert.ok(fullscreen.toggle);

});
