import Ember from 'ember';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { fragmentArray } from 'model-fragments/attributes';

export default Model.extend({
  name: attr('string'),
  chromosomes: fragmentArray('chromosome'),

});
