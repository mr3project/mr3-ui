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

import TableController from './table';
import ColumnDefinition from 'em-table/utils/column-definition';
import TableDefinition from 'em-table/utils/table-definition';

export default TableController.extend({

  queryParams: ["appID", "submitter"],
  appID: "",
  submitter: "",

  // Because pageNo is a query param added by table controller, and in the current design
  // we don't want page to be a query param as only the first page will be loaded first.
  pageNum: 1,

  breadcrumbs: [],

  moreAvailable: false,
  loadingMore: false,

  headerComponentNames: ['apps-page-search', 'table-controls', 'pagination-ui'],

  _definition: TableDefinition.create(),
  // Using computed, as observer won't fire if the property is not used
  definition: Ember.computed("appID", "submitter",
      "pageNum", "moreAvailable", "loadingMore", function () {

    var definition = this.get("_definition");

    definition.setProperties({
      appID: this.get("appID"),
      submitter: this.get("submitter"),

      pageNum: this.get("pageNum"),

      moreAvailable: this.get("moreAvailable"),
      loadingMore: this.get("loadingMore")
    });

    return definition;
  }),

  columns: ColumnDefinition.make([{
    id: 'appID',
    headerTitle: 'Application Id',
    contentPath: 'appID',
    cellComponentName: 'em-table-linked-cell',
    getCellContent: function (row) {
      return {
        routeName: "app",
        model: row.get("appID"),
        text: row.get("appID")
      };
    }
  },{
    id: 'submitter',
    headerTitle: 'Submitter',
    contentPath: 'submitter'
  }]),

  actions: {
    search: function (properties) {
      this.setProperties(properties);
    },
    pageChanged: function (pageNum) {
      this.set("pageNum", pageNum);
    },
  }

});
