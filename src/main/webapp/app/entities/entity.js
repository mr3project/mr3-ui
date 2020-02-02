/*global more*/
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
import NameMixin from '../mixins/name';

var MoreObject = more.Object;

var Entity = Ember.Object.extend(NameMixin, {

  queryRecord: function (loader, id, options, query, urlParams) {
    var that = this;
    return this.get('store').queryRecord(this.get("name"), {
      id: id,
      nameSpace: loader.get('nameSpace'),
      params: query,
      urlParams: urlParams
    }).then(function (record) {
      return that._loadAllNeeds(loader, record, options, urlParams);
    });
  },

  query: function (loader, query, options, urlParams) {
    var that = this;
    return this.get('store').query(this.get("name"), {
      nameSpace: loader.get('nameSpace'),
      params: query,
      urlParams: urlParams
    }).then(function (records) {
      return Ember.RSVP.all(records.map(function (record) {
        return that._loadAllNeeds(loader, record, options, urlParams);
      })).then(function () {
       return records;
      });
    });
  },

  normalizeNeed: function(name, needOptions, parentModel, queryParams, urlParams) {
    var need = {
      name: name,
      type: name,
      idKey: needOptions,

      loadType: "", // Possible values lazy, demand
      silent: false,

      //urlParams
      //queryParams
    },
    overrides = {};

    if(typeof needOptions === 'object') {
      Ember.assert(`idKey not defined for need '${name}'!`, needOptions.idKey);

      if(MoreObject.isFunction(needOptions.urlParams)) {
        overrides.urlParams = needOptions.urlParams.call(needOptions, parentModel);
      }
      if(MoreObject.isFunction(needOptions.queryParams)) {
        overrides.queryParams = needOptions.queryParams.call(needOptions, parentModel);
      }

      overrides = Ember.Object.create({}, needOptions, overrides);
    }

    if(queryParams) {
      overrides.queryParams = Ember.$.extend({}, overrides.queryParams, queryParams);
    }
    if(urlParams) {
      overrides.urlParams = Ember.$.extend({}, overrides.urlParams, urlParams);
    }

    return Ember.Object.create(need, overrides);
  },

  _loadNeed: function (loader, parentModel, needOptions, options, index) {
    var needLoader,
        that = this,
        types = needOptions.type,
        type;

    if(!Array.isArray(types)) {
      types = [types];
    }

    index = index || 0;
    type = types[index];

    needLoader = loader.queryRecord(
      type,
      parentModel.get(needOptions.idKey),
      options,
      needOptions.queryParams,
      needOptions.urlParams
    );

    needLoader = needLoader.then(function (model) {
      parentModel.set(needOptions.name, model);
      parentModel.refreshLoadTime();
      return model;
    });

    needLoader = needLoader.catch(function (err) {
      if(++index < types.length) {
        return that._loadNeed(loader, parentModel, needOptions, options, index);
      }

      if(needOptions.silent) {
        parentModel.set(needOptions.name, null);
        parentModel.refreshLoadTime();
      }
      else {
        throw(err);
      }
    });

    return needLoader;
  },

  loadNeed: function (loader, parentModel, needName, options, queryParams, urlParams) {
    var needOptions = parentModel.get(`needs.${needName}`);
    Ember.assert(`Need '${needName}' not defined in model!`, needOptions);

    needOptions = this.normalizeNeed(needName, needOptions, parentModel, queryParams, urlParams);
    return this._loadNeed(loader, parentModel, needOptions, options);
  },

  _loadAllNeeds: function (loader, model, options/*, urlParams*/) {
    var needsPromise = this.loadAllNeeds(loader, model, options);

    if(needsPromise) {
      return needsPromise.then(function () {
        return model;
      });
    }

    return model;
  },

  loadAllNeeds: function (loader, parentModel, options, queryParams, urlParams) {
    var needLoaders = [],
        that = this,
        needs = parentModel.get("needs");

    if(needs) {
      MoreObject.forEach(needs, function (name, needOptions) {
        needOptions = that.normalizeNeed(name, needOptions, parentModel, queryParams, urlParams);

        if(needOptions.loadType !== "demand") {
          let needLoader = that._loadNeed(loader, parentModel, needOptions, options);

          if(needOptions.loadType !== "lazy") {
            needLoaders.push(needLoader);
          }
        }
      });
    }

    if(needLoaders.length) {
      return Ember.RSVP.all(needLoaders);
    }
  },

});

export default Entity;
