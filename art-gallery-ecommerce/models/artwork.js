const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Artwork = sequelize.define('Artwork', {
        title: { type: DataTypes.STRING, allowNull: false },
        artist: { type: DataTypes.STRING, allowNull: false },
        medium: { type: DataTypes.STRING },
        price: { type: DataTypes.FLOAT, allowNull: false },
        costToGallery: { type: DataTypes.FLOAT, allowNull: false },
        imageUrl: { type: DataTypes.STRING },
        isSold: { type: DataTypes.BOOLEAN, defaultValue: false }
    });
    return Artwork;
};