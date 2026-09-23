const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    artworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
    salePrice: { type: Number, required: true },
    
    // Tax and margin tracking
    vatCollected: { type: Number, required: true }, 
    netRevenue: { type: Number, required: true },
    profitMargin: { type: Number, required: true },
    
    // Chart of accounts tracking for double-entry integration
    debitAccount: { type: String, default: 'Cash/Bank' }, 
    creditAccount: { type: String, default: 'Sales Revenue' }, 
    taxLiabilityAccount: { type: String, default: 'VAT Payable' },
    
    transactionDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);