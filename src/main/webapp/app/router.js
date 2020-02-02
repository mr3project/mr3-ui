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
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('dags', { path: '/' });
  this.route('dag', {path: '/dag/:dag_id'}, function() {
    this.route('vertices');
    this.route('tasks');
    this.route('attempts');
    this.route('counters');
    this.route('index', {path: '/'}, function() {});
    this.route('graphical');
    this.route('swimlane');
  });
  this.route('vertex', {path: '/vertex/:vertex_id'}, function() {
    this.route('tasks');
    this.route('attempts');
    this.route('counters');
  });
  this.route('task', {path: '/task/:task_id'}, function() {
    this.route('attempts');
    this.route('counters');
  });
  this.route('attempt', {path: '/attempt/:attempt_id'}, function () {
    this.route('counters');
  });
  this.route('apps');
  this.route('app', {path: '/app/:app_id'}, function () {
    this.route('dags');
  });
  this.route('containers');
  this.route('container', {path: '/container/:container_id'}, function() {
    this.route('index');
  });
});

export default Router;
