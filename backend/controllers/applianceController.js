const Appliance = require("../models/Appliance");
const { uploadImages, deleteImages, sanitizeImages } = require("../utils/imageService");

const MAX_IMAGES_PER_LISTING = 10;

// @desc    Upload listing images to Cloudinary (multipart, field name "images")
// @route   POST /api/appliances/images
// @access  Private (Owner)
// REQ-9: returns [{ url, publicId }] which the client then sends with the listing
const uploadApplianceImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Attach at least one image in the 'images' field" });
    }
    const images = await uploadImages(req.files);
    return res.status(201).json({ success: true, count: images.length, data: images });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new appliance listing
// @route   POST /api/appliances
// @access  Private (Owner)
// REQ-8, REQ-9, REQ-11: title/description/category/price/deposit, image URLs,
// starts as pending_review
const createAppliance = async (req, res, next) => {
  try {
    const {
      category,
      title,
      description,
      brand,
      model,
      rentPricePerMonth,
      securityDeposit,
      condition,
      location,
      images,
    } = req.body;

    if (!category || !title || !description || !rentPricePerMonth || !securityDeposit || !location?.city) {
      return res.status(400).json({
        success: false,
        message: "category, title, description, rentPricePerMonth, securityDeposit and location.city are required",
      });
    }

    const appliance = await Appliance.create({
      owner: req.user._id,
      category,
      title,
      description,
      brand,
      model,
      rentPricePerMonth,
      securityDeposit,
      condition,
      location,
      images: sanitizeImages(images).slice(0, MAX_IMAGES_PER_LISTING), // uploaded via POST /appliances/images first
      availabilityStatus: "pending_review",
    });

    return res.status(201).json({ success: true, data: appliance });
  } catch (err) {
    next(err);
  }
};

// @desc    Update an existing listing
// @route   PUT /api/appliances/:id
// @access  Private (owning Owner or Admin)
// REQ-10: restrict update/delete to owning Owner or Admin
const updateAppliance = async (req, res, next) => {
  try {
    const appliance = await Appliance.findById(req.params.id);
    if (!appliance) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const isOwnerOfListing = appliance.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwnerOfListing && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this listing" });
    }

    const editable = [
      "category",
      "title",
      "description",
      "brand",
      "model",
      "rentPricePerMonth",
      "securityDeposit",
      "condition",
      "location",
      "images",
    ];
    const previousPublicIds = appliance.images.map((img) => img.publicId);
    editable.forEach((field) => {
      if (field === "images") return;
      if (req.body[field] !== undefined) appliance[field] = req.body[field];
    });
    if (req.body.images !== undefined) {
      appliance.images = sanitizeImages(req.body.images).slice(0, MAX_IMAGES_PER_LISTING);
    }

    await appliance.save();

    // Remove images the owner dropped so they don't linger in Cloudinary storage
    const keptPublicIds = new Set(appliance.images.map((img) => img.publicId));
    await deleteImages(previousPublicIds.filter((id) => !keptPublicIds.has(id)));
    return res.status(200).json({ success: true, data: appliance });
  } catch (err) {
    next(err);
  }
};

// @desc    Archive a listing (soft delete, removes from public search)
// @route   DELETE /api/appliances/:id
// @access  Private (owning Owner or Admin)
const archiveAppliance = async (req, res, next) => {
  try {
    const appliance = await Appliance.findById(req.params.id);
    if (!appliance) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const isOwnerOfListing = appliance.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwnerOfListing && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this listing" });
    }

    appliance.availabilityStatus = "archived";
    await appliance.save();
    return res.status(200).json({ success: true, message: "Listing archived", data: appliance });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all listings belonging to the logged-in Owner (any status)
// @route   GET /api/appliances/my-listings
// @access  Private (Owner)
// REQ-12
const getMyListings = async (req, res, next) => {
  try {
    const listings = await Appliance.find({ owner: req.user._id }).populate("category", "categoryName");
    return res.status(200).json({ success: true, count: listings.length, data: listings });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single listing by id (public)
// @route   GET /api/appliances/:id
// @access  Public
const getApplianceById = async (req, res, next) => {
  try {
    const appliance = await Appliance.findById(req.params.id)
      .populate("category", "categoryName")
      .populate("owner", "name");
    if (!appliance) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    return res.status(200).json({ success: true, data: appliance });
  } catch (err) {
    next(err);
  }
};

// @desc    Search & filter public listings
// @route   GET /api/appliances
// @access  Public
// REQ-13: keyword search over title/description/brand via text index
// REQ-14: filter by category, city, price range (combinable with keyword)
// REQ-15: pagination, max 50 per page
const searchAppliances = async (req, res, next) => {
  try {
    const { keyword, category, city, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    const query = { availabilityStatus: "available" };

    if (keyword) {
      query.$text = { $search: keyword };
    }
    if (category) query.category = category;
    if (city) query["location.city"] = new RegExp(`^${city}$`, "i");
    if (minPrice || maxPrice) {
      query.rentPricePerMonth = {};
      if (minPrice) query.rentPricePerMonth.$gte = Number(minPrice);
      if (maxPrice) query.rentPricePerMonth.$lte = Number(maxPrice);
    }

    const pageSize = Math.min(Number(limit) || 20, 50); // REQ-15: hard cap of 50
    const pageNum = Math.max(Number(page) || 1, 1);

    const [results, total] = await Promise.all([
      Appliance.find(query)
        .populate("category", "categoryName")
        .populate("owner", "name")
        .sort(keyword ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Appliance.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: results.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadApplianceImages,
  createAppliance,
  updateAppliance,
  archiveAppliance,
  getMyListings,
  getApplianceById,
  searchAppliances,
};
