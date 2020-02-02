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

import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

import wait from 'ember-test-helpers/wait';

import Process from 'mr3-ui/utils/process';
import Processor from 'mr3-ui/utils/processor';

moduleForComponent('em-swimlane-process-visual', 'Integration | Component | em swimlane process visual', {
  integration: true
});

test('Basic creation test', function(assert) {
  this.set("process", Process.create());
  this.set("processor", Processor.create());

  this.render(hbs`{{em-swimlane-process-visual process=process processor=processor}}`);

  assert.ok(this.$(".base-line"));
  assert.ok(this.$(".event-window"));

  // Template block usage:" + EOL +
  this.render(hbs`
    {{#em-swimlane-process-visual processor=processor process=process}}
      template block text
    {{/em-swimlane-process-visual}}
  `);

  assert.ok(this.$(".base-line"));
  assert.ok(this.$(".event-window"));
});

test('Events test', function(assert) {
  this.set("process", Process.create({
    events: [{
      name: "event1",
      time: 5
    }, {
      name: "event2",
      time: 7
    }]
  }));
  this.set("processor", Processor.create({
    startTime: 0,
    endTime: 10
  }));

  this.render(hbs`{{em-swimlane-process-visual processor=processor process=process startTime=0 timeWindow=10}}`);

  return wait().then(() => {
    var events = this.$(".em-swimlane-event");

    assert.equal(events.length, 2);
    assert.equal(events.eq(0).attr("style").trim(), "left: 50%;", "em-swimlane-event 1 left");
    assert.equal(events.eq(1).attr("style").trim(), "left: 70%;", "em-swimlane-event 2 left");

    assert.equal(this.$(".process-line").eq(0).attr("style").trim(), "left: 50%; right: 30%;", "process-line");
  });
});
