'use strict';
angular.module('main')
  .constant('st2Config', {

    hosts: [{
      name: 'StackStorm',
      url: 'https://:9101',
      auth: 'https://:9100',
    }]
  });