import React, { Component } from 'react';
import { Badge, Row, Col } from 'reactstrap';
import FirstSeen from './FirstSeen.js';

export default class ValidatorFirstSeen extends Component{
    constructor(props){
        super(props);
    }

    render() {
        return <div>
            <h1>Validators <Badge color="primary">{Meteor.settings.public.chainId}</Badge></h1>
            <p className="lead">First seen time of validators.</p>
            <Row>
                <Col md={12}>
                    <FirstSeen />
                    {/* <List jailed={true}/> */}
                </Col>
            </Row>
        </div>
    }
}