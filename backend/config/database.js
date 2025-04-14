import mongoose from "mongoose";
import dotenv from "dotenv";
import staticData from "../static.json" with {type: "json"};

dotenv.config();

// MongoDB Connection URL - make sure to add this to your .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-documents';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

  const initializeStaticData = async () => {
    try {
      const existingStaticCount = await Asset.countDocuments({ source: 'static' });
      
      // Only seed if no static data exists
      if (existingStaticCount === 0) {
        console.log('Initializing static asset data...');
        
        // Process bank accounts
        const bankAccounts = staticData.bank_accounts.map(bankName => ({
          source: 'static',
          assetType: 'bank_account',
          name: bankName,
          identifierNumber: null
        }));
        
        // Process insurance policies
        const insurancePolicies = staticData.insurances.map(insuranceName => ({
          source: 'static',
          assetType: 'insurance_policy',
          name: insuranceName,
          identifierNumber: null
        }));
        
        // Combine and insert all static data
        const allStaticData = [...bankAccounts, ...insurancePolicies];
        await Asset.insertMany(allStaticData);
        console.log(`Initialized ${allStaticData.length} static assets`);
      }
    } catch (error) {
      console.error('Error initializing static data:', error);
    }
  };

export {mongoose, initializeStaticData};