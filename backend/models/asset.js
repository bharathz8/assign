import mongoose from "mongoose";

const AssetSchema = new mongoose.Schema({
    source: {
      type: String,
      enum: ['static', 'document'],
      required: true,
      description: 'Source of the asset (static predefined list or extracted from document)'
    },
    assetType: {
      type: String,
      enum: ['bank_account', 'insurance_policy', 'vehicle_policy'],
      required: true
    },
    name: {
      type: String,
      required: true,
      description: 'Name of the bank/insurer'
    },
    identifierNumber: {
      type: String,
      description: 'Account number or policy number'
    },
    accountType: {
      type: String,
      description: 'Type of account (savings, current, etc.)'
    },
    balance: {
      type: Number,
      description: 'Balance amount for bank accounts'
    },
    insuredAmount: {
      type: Number,
      description: 'Insured amount for insurance policies'
    },
    premiumAmount: {
      type: Number,
      description: 'Premium amount for insurance policies'
    },
    renewalDate: {
      type: Date,
      description: 'Renewal date for insurance/vehicle policies'
    },
    startDate: {
      type: Date,
      description: 'Start date for policies'
    },
    endDate: {
      type: Date,
      description: 'End date for policies'
    },
    vehicleDetails: {
      type: Object,
      description: 'Vehicle details for vehicle policies'
    },
    extractedFrom: {
      fileId: String,
      fileName: String,
      extractedDate: {
        type: Date,
        default: Date.now
      }
    },
    isManuallyAdded: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  });
  
  // Create indexes for faster querying
  AssetSchema.index({ assetType: 1 });
  AssetSchema.index({ name: 1 });
  AssetSchema.index({ identifierNumber: 1 });
  AssetSchema.index({ source: 1 });
  

  const Asset = mongoose.model('Asset', AssetSchema);

 async function isAssetDuplicate(assetData) {
    const { assetType, name, identifierNumber } = assetData;
    
    // For bank accounts and policies with identifier numbers
    if (identifierNumber) {
      const existing = await Asset.findOne({
        assetType,
        identifierNumber
      });
      return !!existing;
    }
    
    // For assets without identifier numbers, check by name
    const existing = await Asset.findOne({
      assetType,
      name
    });
    return !!existing;
  }

  export {Asset, isAssetDuplicate};