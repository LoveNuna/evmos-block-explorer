import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';

Meteor.methods({
    'Transactions.index': function(hash){
        this.unblock();
        hash = hash.toUpperCase();
        let url = LCD+ '/txs/'+hash;
        let response = HTTP.get(url);
        let tx = JSON.parse(response.content);

        console.log(hash);

        if (tx.result.tags && tx.result.tags.length > 0){
            tx.result.tags.map((tag, i) => {
                let key = Buffer.from(tag.key, 'base64').toString();
                let value = "";
                if (tag.value){
                    value = Buffer.from(tag.value, 'base64').toString();
                }
                tag.key = key;
                tag.value = value;
            });    
        }

        let txId = Transactions.insert(tx);
        if (txId){
            return txId;
        }
        else return false;
    },
    'Transactions.findDelegation': function(address, height){
        return Transactions.find({
            $or: [{$and: [
                {"result.tags.key": "action"}, 
                {"result.tags.value": "delegate"}, 
                {"result.tags.key": "destination-validator"}, 
                {"result.tags.value": address}
            ]}, {$and:[
                {"result.tags.key": "action"}, 
                {"result.tags.value": "unjail"}, 
                {"result.tags.key": "validator"}, 
                {"result.tags.value": address}
            ]}, {$and:[
                {"result.tags.key": "action"}, 
                {"result.tags.value": "create_validator"}, 
                {"result.tags.key": "destination-validator"}, 
                {"result.tags.value": address}
            ]}, {$and:[
                {"result.tags.key": "action"}, 
                {"result.tags.value": "begin_unbonding"}, 
                {"result.tags.key": "source-validator"}, 
                {"result.tags.value": address}
            ]}, {$and:[
                {"result.tags.key": "action"}, 
                {"result.tags.value": "begin_redelegate"}, 
                {"result.tags.key": "destination-validator"}, 
                {"result.tags.value": address}
            ]}], 
            "result.code": {$exists: false}, 
            height:height.toString()}
            ).fetch();
    }
});