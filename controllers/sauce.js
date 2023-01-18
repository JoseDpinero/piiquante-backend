const Sauce = require('../models/Sauce');
const fs = require('fs');

exports.getAllSauces = (req, res, next) => {
    Sauce.find()
        .then(sauces => res.status(200).json(sauces))
        .catch(error => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => res.status(200).json(sauce))
        .catch(error => res.status(404).json({ error }));
};

exports.createSauce = (req, res, next) => {
    const sauceObject = JSON.parse(req.body.sauce);
    delete sauceObject._id;
    delete sauceObject._userId;
    const sauce = new Sauce({
        ...sauceObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    });
    sauce.save()
        .then(() => { res.status(201).json({ message: 'Sauce enregistrée' }) })
        .catch(error => { res.status(400).json({ error }) })
};

exports.modifySauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then((sauce) => {
            if (sauce.userId != req.auth.userId) {
                res.status(403).json({ message: 'Non autorisé' });
            } else {
                if (req.file) {
                    const sauceObject = {
                        ...JSON.parse(req.body.sauce),
                        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
                    }
                    if (sauceObject.userId) delete sauceObject.userId;
                    const filename = sauce.imageUrl.split('/images/')[1];

                    fs.unlink(`images/${filename}`, () => {
                        Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
                            .then(() => res.status(200).json({ message: 'Sauce modifiée' }))
                            .catch(error => res.status(401).json({ error }));
                    }
                    )
                } else {
                    const sauceObject = { ...req.body };
                    if (sauceObject.userId) delete sauceObject.userId;

                    Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
                        .then(() => res.status(200).json({ message: 'Sauce modifiée' }))
                        .catch(error => res.status(401).json({ error }));
                }
            }
        })
        .catch((error) => res.status(400).json({ error }));
};

exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => {
            if (sauce.userId != req.auth.userId) {
                res.status(403).json({ message: 'Non autorisé' });
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Sauce.deleteOne({ _id: req.params.id })
                        .then(() => { res.status(200).json({ message: 'Sauce supprimé' }) })
                        .catch(error => res.status(401).json({ error }));
                });
            }
        })
        .catch(error => res.status(500).json({ error }));
};

exports.likeSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => {
            let allLikes = [];
            let allDislikes = [];
            let likesCount = 0;
            let dislikesCount = 0;

            allLikes = sauce.usersLiked;
            allDislikes = sauce.usersDisliked;

            let likeFound = allLikes.findIndex((element) => element == req.auth.userId);
            let dislikeFound = allDislikes.findIndex((element) => element == req.auth.userId);

            if (likeFound != -1) allLikes.splice(likeFound, 1);
            if (dislikeFound != -1) allDislikes.splice(dislikeFound, 1);

            if (req.body.like == 1) {
                allLikes.push(req.auth.userId);
            } else if (req.body.like == -1) {
                allDislikes.push(req.auth.userId);
            }

            likesCount = allLikes.length;
            dislikesCount = allDislikes.length;

            Sauce.updateOne({ _id: req.params.id }, {
                usersLiked: allLikes,
                usersDisliked: allDislikes,
                likes: likesCount,
                dislikes: dislikesCount,
                _id: req.params.id
            })
                .then(() => res.status(200).json({ message: 'Votre avis a été pris en compte' }))
                .catch(error => res.status(401).json({ error }));
        })
        .catch(error => res.status(500).json({ error }));
};