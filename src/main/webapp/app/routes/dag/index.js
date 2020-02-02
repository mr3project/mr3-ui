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
import SingleAmPollsterRoute from '../single-am-pollster';

import downloadDAGZip from '../../utils/download-dag-zip';

export default SingleAmPollsterRoute.extend({
  title: "DAG Details",

  loaderNamespace: "dag",

  setupController: function (controller, model) {
    this._super(controller, model);
    Ember.run.later(this, "startCrumbBubble");
  },

  load: function (value, query, options) {
    return this.get("loader").queryRecord('dag', this.modelFor("dag").get("id"), options);
  },

  actions: {
    downloadDagJson: function () {
      var dag = this.get("loadedValue"),
          downloader = downloadDAGZip(dag, {
            batchSize: 500,
            timelineHost: this.get("hosts.timeline"),
            timelineNamespace: this.get("env.app.namespaces.webService.timeline")
          }),
          modalContent = Ember.Object.create({
            dag: dag,
            downloader: downloader
          });

      this.send("openModal", "zip-download-modal", {
        title: "Download data",
        content: modalContent
      });
    }
  }

});
