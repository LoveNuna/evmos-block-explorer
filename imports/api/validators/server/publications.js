import { Meteor } from 'meteor/meteor';
import { Validators } from '../validators.js';
import { ValidatorRecords } from '../../records/records.js';
import { VotingPowerHistory } from '../../voting-power/history.js';

Meteor.publish('validators.all', function (sort = "description.moniker", direction = -1) {
    return Validators.find({});
});

publishComposite('validators.firstSeen',{
    find() {
        return Validators.find({});
    },
    children: [
        {
            find(val) {
                return ValidatorRecords.find(
                    { address: val.address },
                    { sort: {height: 1}, limit: 1}
                );
            }
        }
    ]
});

Meteor.publish('validators.voting_power', function(){
    return Validators.find({
            status: 2,
            jailed:false
        },{
            sort:{
                voting_power:-1
            },
            fields:{
                address: 1,
                description:1,
                voting_power:1
            }
        }
    );
});

publishComposite('validator.details', function(address){
    return {
        find(){
            return Validators.find({address:address})
        },
        children: [
            {
                find(val){
                    return VotingPowerHistory.find(
                        {address:val.address},
                        {sort:{height:-1}, limit:50}
                    )
                }
            }
        ]
    }
});
