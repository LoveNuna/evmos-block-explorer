import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Promise } from "meteor/promise";
import { Blockscon } from '/imports/api/blocks/blocks.js';
import { Chain } from '/imports/api/chain/chain.js';
import { ValidatorSets } from '/imports/api/validator-sets/validator-sets.js';
import { Validators } from '/imports/api/validators/validators.js';
import { ValidatorRecords, Analytics} from '/imports/api/records/records.js';
import { VotingPowerHistory } from '/imports/api/voting-power/history.js';
import { Transactions } from '../../transactions/transactions.js';
import { Evidences } from '../../evidences/evidences.js';
import { sha256 } from 'js-sha256';

// import Block from '../../../ui/components/Block';

getValidatorVotingPower = (validators, address) => {
    for (v in validators){
        if (validators[v].address == address){
            return parseInt(validators[v].voting_power);
        }
    }
}

getRemovedValidators = (prevValidators, validators) => {
    // let removeValidators = [];
    for (p in prevValidators){
        for (v in validators){
            if (prevValidators[p].address == validators[v].address){
                prevValidators.splice(p,1);
            }
        }
    }

    return prevValidators;
}

// var filtered = [1, 2, 3, 4, 5].filter(notContainedIn([1, 2, 3, 5]));
// console.log(filtered); // [4]

Meteor.methods({
    'blocks.averageBlockTime'(address){
        let blocks = Blockscon.find({proposerAddress:address}).fetch();
        let heights = blocks.map((block, i) => {
            return block.height;
        });
        let blocksStats = Analytics.find({height:{$in:heights}}).fetch();
        // console.log(blocksStats);

        let totalBlockDiff = 0;
        for (b in blocksStats){
            totalBlockDiff += blocksStats[b].timeDiff;
        }
        return totalBlockDiff/heights.length;
    },
    'blocks.findUpTime'(address){
        let collection = ValidatorRecords.rawCollection();
        // let aggregateQuery = Meteor.wrapAsync(collection.aggregate, collection);
        var pipeline = [
            {$match:{"address":address}}, 
            // {$project:{address:1,height:1,exists:1}},
            {$sort:{"height":-1}},
            {$limit:(Meteor.settings.public.uptimeWindow-1)},
            {$unwind: "$_id"},
            {$group:{
                "_id": "$address",
                "uptime": {
                    "$sum":{
                        $cond: [{$eq: ['$exists', true]}, 1, 0]
                    }
                }
            }
        }];
        // let result = aggregateQuery(pipeline, { cursor: {} });
        
        return Promise.await(collection.aggregate(pipeline).toArray());
        // return .aggregate()
    },
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
        // loop if there's update in db
        if (until > curr) {
            SYNCING = true;

            // get latest validator candidate information
            url = LCD+'/stake/validators';
            response = HTTP.get(url);
            console.log(url);
            let validatorSet = JSON.parse(response.content);

            for (let height = curr+1 ; height <= until ; height++) {
                let startBlockTime = new Date();
                // add timeout here? and outside this loop (for catched up and keep fetching)?
                this.unblock();
                let url = RPC+'/block?height=' + height;
                let analyticsData = {};

                console.log(url);
                try{
                    const bulkValidators = Validators.rawCollection().initializeUnorderedBulkOp();
                    const bulkValidatorRecords = ValidatorRecords.rawCollection().initializeUnorderedBulkOp();
                    const bulkVPHistory = VotingPowerHistory.rawCollection().initializeUnorderedBulkOp();
                    const bulkTransations = Transactions.rawCollection().initializeUnorderedBulkOp();

                    let startGetHeightTime = new Date();
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
                        blockData.proposerAddress = block.block.header.proposer_address;
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
                        
                        // save txs in database
                        if (block.block.data.txs && block.block.data.txs.length > 0){
                            for (t in block.block.data.txs){                               
                                Meteor.call('Transactions.index', sha256(Buffer.from(block.block.data.txs[t], 'base64')), (err, result) => {
                                    if (err){
                                        console.log(err);
                                    }
                                });
                            }
                        }

                        // save double sign evidences
                        if (block.block.evidence.evidence){
                            Evidences.insert({
                                height: height,
                                evidence: block.block.evidence.evidence
                            });
                        }

                        blockData.precommitsCount = blockData.validators.length;

                        analyticsData.height = height;
        
                        let endGetHeightTime = new Date();
                        console.log("Get height time: "+((endGetHeightTime-startGetHeightTime)/1000)+"seconds.");


                        let startGetValidatorsTime = new Date();
                        // update chain status
                        url = RPC+'/validators?height='+height;
                        response = HTTP.get(url);
                        console.log(url);
                        let validators = JSON.parse(response.content);
                        validators.result.block_height = parseInt(validators.result.block_height);
                        ValidatorSets.insert(validators.result);

                        blockData.validatorsCount = validators.result.validators.length;
                        let startBlockInsertTime = new Date();
                        Blockscon.insert(blockData);
                        let endBlockInsertTime = new Date();
                        console.log("Block insert time: "+((endBlockInsertTime-startBlockInsertTime)/1000)+"seconds.");

                        // store valdiators exist records
                        let existingValidators = Validators.find({address:{$exists:true}}).fetch();
                        
                        // record precommits and calculate uptime
                        for (i in existingValidators){
                            let record = {
                                height: height,
                                address: existingValidators[i].address,
                                exists: false,
                                voting_power: getValidatorVotingPower(validators.result.validators, existingValidators[i].address)
                            }

                            for (j in precommits){
                                if (precommits[j] != null){
                                    if (existingValidators[i].address == precommits[j].validator_address){
                                        record.exists = true;
                                        precommits.splice(j,1);                                        
                                        break;
                                    }
                                }
                            }

                            // calculate the uptime based on the records stored in previous blocks
                            // only do this every 15 blocks ~

                            if ((height % 15) == 0){
                                // let startAggTime = new Date();
                                let numBlocks = Meteor.call('blocks.findUpTime', existingValidators[i].address);
                                let uptime = 0;
                                // let endAggTime = new Date();
                                // console.log("Get aggregated uptime for "+existingValidators[i].address+": "+((endAggTime-startAggTime)/1000)+"seconds.");
                                if ((numBlocks[0] != null) && (numBlocks[0].uptime != null)){
                                    uptime = numBlocks[0].uptime;
                                }
                                if (record.exists){
                                    if (uptime < Meteor.settings.public.uptimeWindow){
                                        uptime++;                                           
                                    }
                                    uptime = (uptime / Meteor.settings.public.uptimeWindow)*100;
                                    bulkValidators.find({address:existingValidators[i].address}).updateOne({$set:{uptime:uptime, lastSeen:blockData.time}});
                                }
                                else{
                                    uptime = (uptime / Meteor.settings.public.uptimeWindow)*100;
                                    bulkValidators.find({address:existingValidators[i].address}).updateOne({$set:{uptime:uptime}});
                                }
                            }

                            bulkValidatorRecords.insert(record);
                            // ValidatorRecords.update({height:height,address:record.address},record);                            
                        }                        

                        let chainStatus = Chain.findOne({chainId:block.block_meta.header.chain_id});
                        let lastSyncedTime = chainStatus?chainStatus.lastSyncedTime:0;
                        let timeDiff;
                        let blockTime = Meteor.settings.params.defaultBlockTime;
                        if (lastSyncedTime){
                            let dateLatest = new Date(blockData.time);
                            let dateLast = new Date(lastSyncedTime);
                            timeDiff = Math.abs(dateLatest.getTime() - dateLast.getTime());
                            blockTime = (chainStatus.blockTime * (blockData.height - 1) + timeDiff) / blockData.height;
                        }

                        let endGetValidatorsTime = new Date();
                        console.log("Get height validators time: "+((endGetValidatorsTime-startGetValidatorsTime)/1000)+"seconds.");

                        Chain.update({chainId:block.block_meta.header.chain_id}, {$set:{lastSyncedTime:blockData.time, blockTime:blockTime}});

                        analyticsData.averageBlockTime = blockTime;
                        analyticsData.timeDiff = timeDiff;

                        analyticsData.time = blockData.time;

                        // initialize validator data at first block
                        if (height == 1){
                            Validators.remove({});
                        }

                        analyticsData.voting_power = 0;

                        // validators are all the validators in the current height
                        console.log("validatorSet.length: "+validatorSet.length);
                        let startFindValidatorsNameTime = new Date();
                        if (validators.result){
                            for (v in validators.result.validators){
                                // Validators.insert(validators.result.validators[v]);
                                let validator = validators.result.validators[v];
                                validator.voting_power = parseInt(validator.voting_power);
                                validator.proposer_priority = parseInt(validator.proposer_priority);

                                let valExist = Validators.findOne({"pub_key.value":validator.pub_key.value});
                                if (!valExist){
                                    console.log("validator not in db");
                                    let command = Meteor.settings.bin.gaiadebug+" pubkey "+validator.pub_key.value;
                                    // console.log(command);
                                    // let tempVal = validator;
                                    Meteor.call('runCode', command, function(error, result){
                                        validator.address = result.match(/\s[0-9A-F]{40}$/igm);
                                        validator.address = validator.address[0].trim();
                                        validator.hex = result.match(/\s[0-9A-F]{64}$/igm);
                                        validator.hex = validator.hex[0].trim();
                                        validator.cosmosaccpub = result.match(/cosmospub.*$/igm);
                                        validator.cosmosaccpub = validator.cosmosaccpub[0].trim();
                                        validator.operator_pubkey = result.match(/cosmosvaloperpub.*$/igm);
                                        validator.operator_pubkey = validator.operator_pubkey[0].trim();
                                        validator.consensus_pubkey = result.match(/cosmosvalconspub.*$/igm);
                                        validator.consensus_pubkey = validator.consensus_pubkey[0].trim();

                                        for (val in validatorSet){
                                            if (validatorSet[val].consensus_pubkey == validator.consensus_pubkey){
                                                validator.operator_address = validatorSet[val].operator_address;
                                                validator.jailed = validatorSet[val].jailed;
                                                validator.status = validatorSet[val].status;
                                                validator.tokens = validatorSet[val].tokens;
                                                validator.delegator_shares = validatorSet[val].delegator_shares;
                                                validator.description = validatorSet[val].description;
                                                validator.bond_height = validatorSet[val].bond_height;
                                                validator.bond_intra_tx_counter = validatorSet[val].bond_intra_tx_counter;
                                                validator.unbonding_height = validatorSet[val].unbonding_height;
                                                validator.unbonding_time = validatorSet[val].unbonding_time;
                                                validator.commission = validatorSet[val].commission;
                                                // validator.removed = false,
                                                // validator.removedAt = 0
                                                // validatorSet.splice(val, 1);
                                                break;
                                            }
                                        }
                                        
                                        bulkValidators.insert(validator);
                                        // console.log("validator first appears: "+bulkValidators.length);
                                        bulkVPHistory.insert({
                                            address: validator.address,
                                            prev_voting_power: 0,
                                            voting_power: validator.voting_power,
                                            type: 'add',
                                            height: blockData.height,
                                            block_time: blockData.time
                                        });
                                        
                                    });
                                }
                                else{
                                    for (val in validatorSet){
                                        if (validatorSet[val].consensus_pubkey == valExist.consensus_pubkey){
                                            validator.jailed = validatorSet[val].jailed;
                                            validator.status = validatorSet[val].status;
                                            validator.tokens = validatorSet[val].tokens;
                                            validator.delegator_shares = validatorSet[val].delegator_shares;
                                            validator.description = validatorSet[val].description;
                                            validator.bond_height = validatorSet[val].bond_height;
                                            validator.bond_intra_tx_counter = validatorSet[val].bond_intra_tx_counter;
                                            validator.unbonding_height = validatorSet[val].unbonding_height;
                                            validator.unbonding_time = validatorSet[val].unbonding_time;
                                            validator.commission = validatorSet[val].commission;
                                            
                                            bulkValidators.find({consensus_pubkey: valExist.consensus_pubkey}).updateOne({$set:validator});
                                            // console.log("validator exisits: "+bulkValidators.length);
                                            // validatorSet.splice(val, 1);
                                            break;
                                        }
                                    }
                                    let prevVotingPower = VotingPowerHistory.findOne({address:validator.address}, {height:-1, limit:1});
                                    
                                    
                                    if (prevVotingPower.voting_power != validator.voting_power){
                                        let changeType = (prevVotingPower > validator.voting_power)?'down':'up';
                                        let changeData = {
                                            address: validator.address,
                                            prev_voting_power: prevVotingPower.voting_power,
                                            voting_power: validator.voting_power,
                                            type: changeType,
                                            height: blockData.height,
                                            block_time: blockData.time
                                        };
                                        // console.log('voting power changed.');
                                        // console.log(changeData);
                                        bulkVPHistory.insert(changeData);
                                    }
                                }
                                

                                // console.log(validator);

                                analyticsData.voting_power += validator.voting_power;
                            }

                            // if there is validator removed

                            let prevValidators = ValidatorSets.findOne({block_height:height-1});
                            
                            if (prevValidators){
                                let removedValidators = getRemovedValidators(prevValidators.validators, validators.result.validators);

                                for (r in removedValidators){
                                    bulkVPHistory.insert({
                                        address: removedValidators[r].address,
                                        prev_voting_power: removedValidators[r].voting_power,
                                        voting_power: 0,
                                        type: 'remove',
                                        height: blockData.height,
                                        block_time: blockData.time
                                    });
                                }
                            }
                            
                        }


                        let endFindValidatorsNameTime = new Date();
                        console.log("Get validators name time: "+((endFindValidatorsNameTime-startFindValidatorsNameTime)/1000)+"seconds.");
                    
                        // record for analytics
                        let startAnayticsInsertTime = new Date();
                        Analytics.insert(analyticsData);
                        let endAnalyticsInsertTime = new Date();
                        console.log("Analytics insert time: "+((endAnalyticsInsertTime-startAnayticsInsertTime)/1000)+"seconds.");


                        let startVUpTime = new Date();
                        if (bulkValidators.length > 0){
                            // console.log(bulkValidators.length);
                            bulkValidators.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                        }
                        
                        let endVUpTime = new Date();
                        console.log("Validator update time: "+((endVUpTime-startVUpTime)/1000)+"seconds.");

                        let startVRTime = new Date();
                        if (bulkValidatorRecords.length > 0){
                            bulkValidatorRecords.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                        }
                        

                        let endVRTime = new Date();
                        console.log("Validator records update time: "+((endVRTime-startVRTime)/1000)+"seconds.");

                        if (bulkVPHistory.length > 0){
                            bulkVPHistory.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                        }

                        if (bulkTransations.length > 0){
                            bulkTransations.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                        }
                        
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
            Chain.update({chainId:Meteor.settings.public.chainId}, {$set:{lastBlocksSyncedTime:new Date()}});
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