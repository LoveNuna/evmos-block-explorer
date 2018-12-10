import React, { Component } from 'react';
import { Table, Progress } from 'reactstrap';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Meteor } from 'meteor/meteor';
import numeral from 'numeral';

const ValidatorRow = (props) => {
    let moniker = (props.validator.description.moniker)?props.validator.description.moniker:props.validator.address;
    return <tr><th scope="row" className="d-none d-md-table-cell counter">{props.index+1}</th><td><Link to={"/validator/"+props.validator.address}><img src={"https://ui-avatars.com/api/?rounded=true&size=128&name="+moniker} className="moniker-avatar-list" />{moniker} {props.validator.description.identity? <i className="fas fa-check-circle text-success" title={props.validator.description.identity}></i>:''}</Link></td><td className="voting-power">{numeral(props.validator.voting_power).format('0,0')}</td><td className="uptime"><Progress animated value={props.validator.uptime}>{props.validator.uptime?props.validator.uptime.toFixed(2):0}%</Progress></td><td>{(props.validator.lastSeen)?moment.utc(props.validator.lastSeen).format("D MMM YYYY, h:mm:ssa z"):''}</td></tr>
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
                            <th className="d-none d-md-table-cell counter">&nbsp;</th>
                            <th className="moniker"><i className="material-icons">perm_contact_calendar</i> <span className="d-none d-sm-inline">Moniker</span></th>
                            <th className="voting-power"><i className="material-icons">power</i> <span className="d-none d-sm-inline">Voting Power</span></th>
                            <th className="uptime"><i className="material-icons">flash_on</i> <span className="d-none d-sm-inline">Uptime (last {Meteor.settings.public.uptimeWindow} blocks)</span></th>
                            <th className="last-seen"><i className="material-icons">access_time</i> <span className="d-none d-sm-inline">Last Seen</span></th>
                        </tr>
                    </thead>
                    <tbody>{this.state.validators}</tbody>
                </Table>
            )    
        }
    }
}