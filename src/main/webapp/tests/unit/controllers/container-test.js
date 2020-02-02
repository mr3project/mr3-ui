/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Ember from 'ember';

import { moduleFor, test } from 'ember-qunit';

moduleFor('controller:container', 'Unit | Controller | container', {
  // Specify the other units that are required for this test.
  // needs: ['controller:foo']
});

test('Basic creation test', function(assert) {
  let controller = this.subject({
    send: Ember.K,
    initVisibleColumns: Ember.K
  });

  assert.ok(controller);
  assert.ok(controller.breadcrumbs);
  assert.ok(controller.tabs);
});

test('breadcrumbs test', function(assert) {
  let containerID = 123,
  controller = this.subject({
    send: Ember.K,
    initVisibleColumns: Ember.K,
    model: {
      containerID: containerID,
    }
  });

  assert.equal(controller.get("breadcrumbs.length"), 1);
  assert.equal(controller.get("breadcrumbs.0.text"), `Application [ ${containerID} ]`);
  assert.equal(controller.get("breadcrumbs.0.routeName"), 'container.index');
  assert.equal(controller.get("breadcrumbs.0.model"), containerID);
});
