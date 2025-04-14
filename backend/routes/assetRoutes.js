import express from "express";
const router = express.Router();

router.get('/assets', async (req, res) => {
    try {
      const assets = await Asset.find().sort({ assetType: 1, name: 1 });
      res.json(assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  });
  
  router.get('/missing-assets', async (req, res) => {
    try {
      // First get all static assets
      const staticAssets = await Asset.find({ source: 'static' });
      
      // Then get all document assets
      const documentAssets = await Asset.find({ source: 'document' });
      
      // Organize static assets by type for easier comparison
      const staticMap = {
        bank_account: new Set(),
        insurance_policy: new Set(),
        vehicle_policy: new Set()
      };
      
      staticAssets.forEach(asset => {
        if (asset.identifierNumber) {
          staticMap[asset.assetType].add(asset.identifierNumber);
        } else {
          staticMap[asset.assetType].add(asset.name);
        }
      });
      
      // Find missing assets (those not in the static list)
      const missingAssets = documentAssets.filter(asset => {
        const identifier = asset.identifierNumber || asset.name;
        return !staticMap[asset.assetType].has(identifier);
      });
      
      // Group missing assets by type for the response
      const response = {
        missing_bank_accounts: missingAssets.filter(a => a.assetType === 'bank_account'),
        missing_insurances: missingAssets.filter(a => a.assetType === 'insurance_policy'),
        missing_vehicle_policies: missingAssets.filter(a => a.assetType === 'vehicle_policy')
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching missing assets:', error);
      res.status(500).json({ error: 'Failed to fetch missing assets' });
    }
  });
  
  router.post('/assets', async (req, res) => {
    try {
      const assetData = {
        ...req.body,
        source: 'document',
        isManuallyAdded: true
      };
      
      // Validate required fields
      if (!assetData.assetType || !assetData.name) {
        return res.status(400).json({ error: 'Asset type and name are required' });
      }
      
      // Check for duplicates
      const isDuplicate = await isAssetDuplicate(assetData);
      if (isDuplicate) {
        return res.status(409).json({ error: 'Asset already exists' });
      }
      
      // Create new asset
      const newAsset = new Asset(assetData);
      await newAsset.save();
      
      res.status(201).json(newAsset);
    } catch (error) {
      console.error('Error adding new asset:', error);
      res.status(500).json({ error: 'Failed to add new asset' });
    }
  });

  export default router;