const Banner = require('../models/Banner');

const bannerController = {
  // Create banner - Admin only
  createBanner: async (req, res) => {
    try {
      const banner = new Banner(req.body);
      await banner.save();
      res.status(201).json({ success: true, data: banner });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all active banners - Public
  getAllBanners: async (req, res) => {
    try {
      const banners = await Banner.find({ is_active: true });
      res.json({ success: true, data: banners });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update banner - Admin only
  updateBanner: async (req, res) => {
    try {
      const banner = await Banner.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      res.json({ success: true, data: banner });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Delete banner - Admin only
  deleteBanner: async (req, res) => {
    try {
      const banner = await Banner.findByIdAndDelete(req.params.id);

      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = bannerController;