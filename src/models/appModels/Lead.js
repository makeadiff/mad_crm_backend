// const { website } = require('@/locale/translation/en_us');
const { string } = require('joi');
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  lead_status: {
    type: String,
    enum: [
      'new',
      'first_conversation',
      'interested',
      'interested_but_facing_delay',
      'not_interested',
      'converted',
      'dropped',
    ],
    default: 'new',
  },
  co_name: {
    type: String,
    required: true,
  },
  partner_name: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  lead_source: String,
  is_poc: {
    type: Boolean,
    default: false,
  },
  poc_name: String,
  poc_designation: String,
  poc_contact: String,
  poc_email: String,
  affiliated_school: String,
  potential_no_of_children: String,
  date_of_first_conversation: Date,
  type_of_school: String,
  mou_signed: String,
  date_of_mou_signing: Date,
  specific_document_required: String,
  specify_required_document: String,
  phone: String,
  country: String,
  // email: String,
  // partner_type: String,
  community_organizer: String,
  // city: String,
  pincode: String,
  // processed: String,
  // location: String,
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require('mongoose-autopopulate'));

const Lead = mongoose.model('Lead', schema);

module.exports = Lead;
