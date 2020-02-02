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
import AmPollsterRoute from './am-pollster';

export default AmPollsterRoute.extend({

  // TODO: loadedValue.app.isComplete -> loadedValue.isComplete. check me when enabling contactAm
  canPoll: Ember.computed("polledRecords", "loadedValue.isComplete", function () {
    var isComplete = this.get("loadedValue.isComplete");
    return isComplete === false && this._super();
  }),

  _loadedValueObserver: Ember.observer("loadedValue.loadTime", function () {
    var loadedValue = this.get("loadedValue");
    if(this.get("env.app.contactAm")) {
      this.set("polledRecords", loadedValue ? [this.get("loadedValue")] : null);
    }
  })

});
