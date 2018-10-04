import React, { Component } from 'react';
import { Table, Progress } from 'reactstrap';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Meteor } from 'meteor/meteor';

const ValidatorRow = (props) => {
    let moniker = (props.validator.description.moniker)?props.validator.description.moniker:props.validator.address;
    return <tr><th scope="row" className="d-none d-sm-block">{props.index+1}</th><td><Link to="#">{moniker}</Link></td><td>{props.validator.voting_power}</td><td><Progress animated value={props.validator.uptimePercent()}>{props.validator.uptimePercent()}%</Progress></td><td>{(props.validator.lastSeen)?moment.utc(props.validator.lastSeen).format("D MMM YYYY, h:mm:ssa z"):''}</td></tr>
}

export default class List extends Component{
    constructor(props){
        super(props);
        this.state = {
            validators: ""
        }
    }

    componentDidUpdate(prevState){
        if (this.props.validators != prevState.validators){
            if (this.props.validators.length > 0){
                this.setState({
                    validators: this.props.validators.map((validator, i) => {
                        return <ValidatorRow key={i} index={i} validator={validator} />
                    })
                })    
            }
        }
    }

    render(){
        if (this.props.loading){
            return <div>Loading</div>
        }
        else{
            return (
                <Table striped className="validator-list">
                    <thead>
                        <tr>
                            <th className="d-none d-sm-block">&nbsp;</th>
                            <th>Moniker</th>
                            <th>Voting Power</th>
                            <th>Uptime (last {Meteor.settings.public.uptimeWindow} blocks}</th>
                            <th>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>{this.state.validators}</tbody>
                </Table>
            )    
        }
    }
}