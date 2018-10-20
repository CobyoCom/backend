"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLFloat, GraphQLNonNull, GraphQLString} = require("graphql");

const type = new GraphQLObjectType({
  name: "Place",
  fields: function() { return {
    address:        { type: GraphQLString },
    latitude:       { type: GraphQLFloat },
    longitude:      { type: GraphQLFloat },
    googlePlaceId:  { type: GraphQLString },
    photoUrl:       { type: GraphQLString },
  }; },
});

const inputType = new GraphQLInputObjectType({
  name: "PlaceInput",
  fields: function() { return {
    address:        { type: GraphQLString },
    latitude:       { type: GraphQLFloat },
    longitude:      { type: GraphQLFloat },
    googlePlaceId:  { type: GraphQLString },
    photoUrl:       { type: GraphQLString },
  }; },
});


module.exports.EventToPlace = {
  type,
  resolve: function(event, _, context) {
    return new Promise(function(resolve, reject) {
    /* TODO if photos is null, https://maps.googleapis.com/maps/api/place/details/output?parameters
     * if return is empty, set empty, save, and return null
     * photos = [{photoReference: xxx, photoUrl: yyy (or null)}]
     * select 1 photo at random
     * if photoUrl is null, https://maps.googleapis.com/maps/api/place/
     */
      event.place.photoUrl = "https://envato-shoebox-0.imgix.net/2a41/93b3-6f8b-4f1c-8767-cd9772b4ded7/kave+310.jpg?w=500&h=278&fit=crop&crop=edges&auto=compress%2Cformat&s=fbc0d75299d7cfda0b3c60ea52ba4aaf";
      return resolve(event.place);
    });
  },
};

module.exports.EventInputToPlaceInput = {
  type: inputType,
};

module.exports.build = function(_) {

};

