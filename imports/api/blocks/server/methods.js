import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import { Blockscon } from '/imports/api/blocks/blocks.js';
import { Chain } from '/imports/api/chain/chain.js';
import { ValidatorSets } from '/imports/api/validator-sets/validator-sets.js';
import { Validators } from '/imports/api/validators/validators.js';
import { ValidatorRecords, Analytics} from '/imports/api/records/records.js';

Meteor.methods({
    'blocks.getLatestHeight': function() {
        this.unblock();
        let url = RPC+'/status';
        try{
            let response = HTTP.get(url);
            let status = JSON.parse(response.content);
            return (status.result.sync_info.latest_block_height);    
        }
        catch (e){
            return 0;
        }
    },
    'blocks.getCurrentHeight': function() {
        this.unblock();
        let currHeight = Blockscon.find({},{sort:{height:-1},limit:1}).fetch();
        // console.log("currentHeight:"+currHeight);
        if (currHeight && currHeight.length == 1)
            return currHeight[0].height; 
        else return Meteor.settings.params.startHeight;
    },
    'blocks.blocksUpdate': function() {
        if (SYNCING)
            return "Syncing...";
        else console.log("start to sync");
        // Meteor.clearInterval(Meteor.timerHandle);
        // get the latest height
        let until = Meteor.call('blocks.getLatestHeight');
        // console.log(until);
        // get the current height in db
        let curr = Meteor.call('blocks.getCurrentHeight');
        console.log(curr);
        // Blockscon.insert({height: 123, hash: "1234", transNum: 1234, time: "1234"});
        // loop if there's update in db
        if (until > curr) {
            SYNCING = true;
            for (let height = curr+1 ; height <= until ; height++) {
                let startBlockTime = new Date();
                // add timeout here? and outside this loop (for catched up and keep fetching)?
                this.unblock();
                let url = RPC+'/block?height=' + height;
                let analyticsData = {};

                console.log(url);
                try{
                    let response = HTTP.get(url);
                    if (response.statusCode == 200){
                        let block = JSON.parse(response.content);
                        block = block.result;
                        // store height, hash, numtransaction and time in db
                        let blockData = {};
                        blockData.height = height;
                        blockData.hash = block.block_meta.block_id.hash;
                        blockData.transNum = block.block_meta.header.num_txs;
                        blockData.time = block.block.header.time;
                        blockData.lastBlockHash = block.block.header.last_block_id.hash;
                        blockData.validators = [];
                        let precommits = block.block.last_commit.precommits;
                        if (precommits != null){
                            // console.log(precommits.length);
                            for (let i=0; i<precommits.length; i++){
                                if (precommits[i] != null){
                                    blockData.validators.push(precommits[i].validator_address);
                                }
                            }

                            analyticsData.precommits = precommits.length;
                            // record for analytics
                            // PrecommitRecords.insert({height:height, precommits:precommits.length});
                        }                      
                        
                        Blockscon.update({height:height},blockData,{upsert:true});
                        
                        // store valdiators exist records
                        let existingValidators = Validators.find({address:{$exists:true}}).fetch();
                        
                        
                        for (i in existingValidators){
                            let record = {
                                height: height,
                                address: existingValidators[i].address,
                                exists: false,
                                voting_power: existingValidators[i].voting_power
                            }
                            let uptime = 0;
                            if (typeof existingValidators[i].uptime !== 'undefined'){
                                uptime = existingValidators[i].uptime;
                            }
                            // let precommitsExists = false;
                            for (j in precommits){
                                if (precommits[j] != null){
                                    if (existingValidators[i].address == precommits[j].validator_address){
                                        record.exists = true;
                                        precommits.splice(j,1);                                        
                                        break;
                                    }
                                }
                            }

                            var startTime = new Date();

                            if (record.exists){
                                if (uptime < 100){
                                    uptime++;                                           
                                }
                                Validators.update({address:existingValidators[i].address}, {$set:{uptime:uptime, lastSeen:blockData.time}});
                            }
                            else{
                                if (uptime > 0){
                                    uptime--;
                                }
                                Validators.update({address:existingValidators[i].address}, {$set:{uptime:uptime}});
                            }

                            ValidatorRecords.update({height:height,address:record.address},record,{upsert:true});

                            var endTime = new Date();
                            console.log("This block precommit time used: "+((endTime - startTime)/1000)+"seconds.");
                            
                        }
                        
                        analyticsData.height = height;
        
                        // update chain status
                        url = RPC+'/validators?height='+height;
                        response = HTTP.get(url);
                        // console.log(url);
                        let validators = JSON.parse(response.content);
                        ValidatorSets.insert(validators.result);
                        let chainStatus = Chain.findOne({chainId:block.block_meta.header.chain_id});
                        // console.log(chainStatus);
                        let lastSyncedTime = chainStatus.lastSyncedTime;
                        let timeDiff;
                        let blockTime = Meteor.settings.params.defaultBlockTime;
                        if (lastSyncedTime){
                            let dateLatest = new Date(blockData.time);
                            let dateLast = new Date(lastSyncedTime);
                            timeDiff = Math.abs(dateLatest.getTime() - dateLast.getTime());
                            blockTime = (chainStatus.blockTime * (blockData.height - 1) + timeDiff) / blockData.height;
                        }

                        Chain.update({chainId:block.block_meta.header.chain_id}, {$set:{lastSyncedTime:blockData.time, blockTime:blockTime}});

                        analyticsData.averageBlockTime = blockTime;
                        analyticsData.timeDiff = timeDiff;

                        analyticsData.time = blockData.time;

                        // initialize validator data at first block
                        if (height == 1){
                            Validators.remove({});
                        }
                        url = LCD+'/stake/validators';
                        response = HTTP.get(url);
                        // console.log(url);
                        let validatorSet = JSON.parse(response.content);
                    
                        analyticsData.voting_power = 0;
                        for (v in validators.result.validators){
                            // Validators.insert(validators.result.validators[v]);
                            let validator = validators.result.validators[v];
                            validator.voting_power = parseInt(validator.voting_power);

                            let valExist = Validators.findOne({address:validator.address});
                            if (!valExist){
                                let command = Meteor.settings.bin.gaiadebug+" pubkey "+validator.pub_key.value;
                                Meteor.call('runCode', command, function(error, result){
                                    // validator.address = result.match(/\s[0-9A-F]{40}$/igm);
                                    // validator.address = validator.address[0].trim();
                                    validator.hex = result.match(/\s[0-9A-F]{64}$/igm);
                                    validator.hex = validator.hex[0].trim();
                                    validator.cosmosaccpub = result.match(/cosmosaccpub.*$/igm);
                                    validator.cosmosaccpub = validator.cosmosaccpub[0].trim();
                                    validator.pub_key = result.match(/cosmosvalpub.*$/igm);
                                    validator.pub_key = validator.pub_key[0].trim();

                                    for (val in validatorSet){
                                        if (validatorSet[val].pub_key == validator.cosmosvalpub){
                                            validator.owner = validatorSet[val].owner;
                                            validatorSet.splice(val, 1);
                                            break;
                                        }
                                    }

                                    // console.log(validator);
                                    Validators.update({pub_key: validator.pub_key}, {$set:validator}, {upsert:true});
                                });
                            }
                            else{
                                // we can check if the voting power has changed here.
                                Validators.update({address: validator.address}, {$set:validator});
                            }

                            analyticsData.voting_power += validator.voting_power;
                        }
                    
                        // record for analytics
                        Analytics.update({height:height},analyticsData,{upsert:true});
                    }                    
                }
                catch (e){
                    console.log(e);
                    SYNCING = false;
                    return "Stopped";
                }
                let endBlockTime = new Date();
                console.log("This block used: "+((endBlockTime-startBlockTime)/1000)+"seconds.");
            }
            SYNCING = false;
        }
        
        return until;
    },
    'addLimit': function(limit) {
        // console.log(limit+10)
        return (limit+10);
    },
    'hasMore': function(limit) {
        if (limit > Meteor.call('getCurrentHeight')) {
            return (false);
        } else {
            return (true);
        }
    }
});