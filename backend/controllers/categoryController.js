const Category = require("../models/Category");

// @desc    List all categories (for filter/creation dropdowns)
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ categoryName: 1 });
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories };
