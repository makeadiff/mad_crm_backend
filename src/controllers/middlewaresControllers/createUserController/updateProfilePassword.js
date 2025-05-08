const bcrypt = require('bcryptjs');
const { User} = require('../../../../models'); // Adjust path as needed

const updateProfilePassword = async (req, res) => {
  console.log('Update password API hit');

  const userId = req.user.user_id;
  const { password, passwordCheck } = req.body;

  if (!password || !passwordCheck) {
    return res.status(400).json({ msg: 'Not all fields have been entered.' });
  }

  if (password.length < 8) {
    return res.status(400).json({
      msg: 'The password needs to be at least 8 characters long.',
    });
  }

  if (password !== passwordCheck) {
    return res.status(400).json({ msg: 'Enter the same password twice for verification.' });
  }

  try {
    const user = await User.findOne({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    if (user.email === 'admin@demo.com') {
      return res.status(403).json({
        success: false,
        message: "You couldn't update demo password",
      });
    }

    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    await user.update({
      updated_password: password,
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the password.',
    });
  }
};

module.exports = updateProfilePassword;
