const { Op } = require('sequelize');
const { Partner, PartnerAgreement, Poc, PocPartner, Meeting, Mou } = require('../../../../models');
const { uploadFileToS3 } = require('../../../middlewares/uploadMiddleware/uploadFileToS3');

const update = async (req, res) => {
  try {
    console.log('Organization Update API hit');

    const partnerId = req.params.id;
    const {
      conversion_stage,
      potential_child_count,
      partner_affiliation_type,
      school_type,
      total_child_count,
      classes,
      low_income_resource,
      poc_name,
      poc_designation,
      poc_contact,
      poc_email,
      date_of_first_contact,
      specific_doc_required,
      specific_doc_name,
      mou_sign,
      mou_sign_date,
      mou_start_date,
      mou_end_date,
      confirmed_child_count,
      current_status,
      expected_conversion_day,
      non_conversion_reason,
      if_any_other_reason,
      agreement_drop_date,
      partner_name,
      address_line_1,
      address_line_2,
      state_id,
      city_id,
      pincode,
      lead_source,
      mou_document,
      latest_mou_id,
      poc_id
    } = req.body;

    // console.log('req.body:', req.body);
    // console.log('req.files:', req.files);

    // Find existing partner
    const partner = await Partner.findByPk(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }
    // console.log('partner details find in update.js :', partner.dataValues);
    // Update Partner
    await Partner.update(
      {
        partner_name,
        address_line_1,
        address_line_2,
        partner_affiliation_type,
        school_type,
        total_child_count,
        state_id,
        city_id,
        pincode,
        lead_source,
        classes,
        low_income_resource,
      },
      { where: { id: partnerId } }
    );
    // console.log("poc_id from the frontend to organization :", poc_id)
    const findPoc = await Poc.findByPk(poc_id);

    if (!findPoc) {
      return res.status(404).json({ success: false, message: 'Poc not found' });
    }

    const updatePoc = await Poc.update(
      {
        partner_id: partnerId,
        poc_name,
        poc_designation,
        poc_contact,
        poc_email,
        date_of_first_contact,
      },
      { where: { id: poc_id } }
    );


    if (mou_sign && req.files && req.files['mou_document[0][originFileObj]']) {

      const findMou = await Mou.findByPk(latest_mou_id)
      if (!findMou) {
      return res.status(404).json({ success: false, message: 'Mou not found' });
    }

      // console.log('Flow goes inside the upload feature new mou is starting uploaded');

      const file = req.files['mou_document[0][originFileObj]']; // Extract file correctly
      const originalName = req.body['mou_document[0][name]'] || 'uploaded-file.pdf'; // Get filename from request

      let mou_url = "";

      try {
        mou_url = await uploadFileToS3(file, 'mou_documents', originalName); // Upload to S3
        // console.log('MOU uploaded URL:', mou_url);
      } catch (error) {
        console.error('Error uploading to S3:', error);
        return res.status(500).json({ success: false, message: 'File upload failed' });
      }
      const inactiveLastMou = await Mou.update(
        {
          partner_id: partnerId,
          mou_status: 'inactive',
        },
        { where: { id: latest_mou_id } }
      );


      const createNewMou = await Mou.create(
        {
          partner_id: partnerId,
          mou_sign: true,
          mou_sign_date,
          mou_start_date,
          mou_end_date,
          mou_status: 'active',
          confirmed_child_count,
          mou_url,
        }
      );

      // console.log("yess mou is updated and the details are :", updateMou)
    }

    


    // console.log("partner table data updated")

    // // Find latest partner agreement
    // let latestAgreement = await PartnerAgreement.findOne({
    //   where: { partner_id: partnerId },
    //   order: [['createdAt', 'DESC']],
    // });

    // // console.log('latest partner agreement data : ', latestAgreement.dataValues);

    // //here we extract tha stage value
    // latestAgreement = latestAgreement.dataValues;

    // // console.log('latest partner agreement conversion value: ', latestAgreement);

    // // Handle conversion status changes
    // if (latestAgreement?.conversion_stage !== conversion_stage) {
    //   console.log("------------------------> conversion stage is changed <-------------------------")
    //   if (conversion_stage === 'first_conversation') {
    //     console.log('conversion stage changed to first_conversation');

    //     const newAgreement = await PartnerAgreement.create({
    //       partner_id: partnerId,
    //       conversion_stage: 'first_conversation',
    //       potential_child_count,
    //     });
    //     console.log("---------> new to first_conversation ----->new partner agreement created")
    //     const newPoc = await Poc.create({
    //       partner_id: partnerId,
    //       poc_name,
    //       poc_designation,
    //       poc_contact,
    //       poc_email,
    //       date_of_first_contact,
    //     });
    //     console.log('---------> new to first_conversation ----->new poc created');

    //     await PocPartner.create({
    //       poc_id: newPoc.dataValues.id,
    //       partner_id: partnerId,
    //     });
    //     console.log('---------> new to first_conversation ----->new  poc-partner created');

    //     await Meeting.create({
    //       user_id: partner.dataValues.created_by,
    //       poc_id: newPoc.dataValues.id,
    //       partner_id: partnerId,
    //       meeting_date: date_of_first_contact,
    //     });
    //     console.log('---------> new to first_conversation ----->new meeting created');
    //   }

    //   if (conversion_stage === 'interested') {
    //     console.log(`---------> ${latestAgreement.conversion_stage} to interested ----->`);
    //     let mou_url = 'testing started' || null;

    //     if (mou_sign && req.files && req.files['mou_document[0][originFileObj]']) {
    //       console.log('Flow goes inside the upload feature');

    //       const file = req.files['mou_document[0][originFileObj]']; // Extract file correctly
    //       const originalName = req.body['mou_document[0][name]'] || 'uploaded-file.pdf'; // Get filename from request

    //       try {
    //         mou_url = await uploadFileToS3(file, 'mou_documents', originalName); // Upload to S3
    //         console.log('MOU uploaded URL:', mou_url);
    //       } catch (error) {
    //         console.error('Error uploading to S3:', error);
    //         return res.status(500).json({ success: false, message: 'File upload failed' });
    //       }
    //     }

    //     const newAgreement = await PartnerAgreement.create({
    //       partner_id: partnerId,
    //       conversion_stage: 'interested',
    //       specific_doc_required,
    //       specific_doc_name,
    //       potential_child_count,
    //     });

    //     console.log(
    //       `--------->${latestAgreement.conversion_stage} to interested ----->new partner agreement interested created`
    //     );

    //     const newConvertedAgreement = await PartnerAgreement.create({
    //       partner_id: partnerId,
    //       conversion_stage: 'converted',
    //       specific_doc_required,
    //       specific_doc_name,
    //       potential_child_count,
    //     });

    //     console.log(
    //       `--------->${latestAgreement.conversion_stage} to interested ----->new partner agreement converted created`
    //     );

    //     await Mou.create({
    //       partner_id: partnerId,
    //       mou_sign: true,
    //       mou_sign_date,
    //       mou_start_date,
    //       mou_end_date,
    //       mou_status: 'active',
    //       confirmed_child_count,
    //       mou_url,
    //     });

    //     console.log(
    //       `--------->${latestAgreement.conversion_stage} to interested ----->new mou created`
    //     );

    //     return res
    //       .status(200)
    //       .json({ success: true, message: 'Successfully converted lead to interested.' });
    //   }

    //   if (conversion_stage === 'interested_but_facing_delay') {
    //     console.log(
    //       `--------->${latestAgreement.conversion_stage} to interested_but_facing_delay ------------->`
    //     );

    //     await PartnerAgreement.create({
    //       partner_id: partnerId,
    //       conversion_stage: 'interested_but_facing_delay',
    //       specific_doc_required,
    //       specific_doc_name,
    //       potential_child_count,
    //       current_status,
    //       expected_conversion_day,
    //     });

    //     console.log(
    //       `--------->${latestAgreement.conversion_stage} to interested_but_facing_delay -------------> new partner agreement created`
    //     );
    //   }

      

    //   if (conversion_stage === 'not_interested') {
    //     console.log(
    //       `--------->${latestAgreement.conversion_stage} to not_interested -------------> `
    //     );

    //     const latestPocPartner = await PocPartner.findOne({
    //       where: { partner_id: partnerId },
    //       order: [['createdAt', 'DESC']], // Get the latest entry
    //     });

    //     if(latestPocPartner){
    //       console.log("----------------exist poc partner details found --------------")
    //     }

    //     if(!latestPocPartner){

    //       console.log('----------------exist poc partner details not found --------------');

    //       //need to create poc details 
    //       const newPoc = await Poc.create({
    //       partner_id: partnerId,
    //       poc_name,
    //       poc_designation,
    //       poc_contact,
    //       poc_email,
    //       date_of_first_contact,
    //     });

    //       console.log('----------------new poc created --------------');

    //       await PocPartner.create({
    //         partner_id : partnerId,
    //         poc_id : newPoc.dataValues.id
    //       })
    //       console.log('----------------new poc partner created --------------');
           
    //       await PartnerAgreement.create({
    //         partner_id: partnerId,
    //         conversion_stage: 'first_conversation',
    //         potential_child_count,
    //       });

    //       console.log('----------------partner agreement created --------------');

    //     }

    //     await PartnerAgreement.create({
    //       partner_id: partnerId,
    //       conversion_stage: 'not_interested',
    //       non_conversion_reason: non_conversion_reason || if_any_other_reason,
    //       agreement_drop_date,
    //       potential_child_count
    //     });

    //     console.log(`--------->${latestAgreement.conversion_stage} to not_interested -------------> new partner agreement created`);
    //   }
    // }

    return res
      .status(200)
      .json({ success: true, message: 'Successfully updated Organization details and agreements.' });
  } catch (error) {
    console.error('Error updating organization:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating organization details',
      error: error.message,
    });
  }
};

module.exports = update;
