import React, { Component } from 'react';
import { Container, Row, Col, Card, CardBody, Alert, Spinner } from 'reactstrap';
import { Link } from 'react-router-dom';
import numeral from 'numeral';
import moment from 'moment';
export default class Block extends Component{
    constructor(props){
        super(props);
    }

    render(){
        if (this.props.loading){
            return <Container id="block">
                <Spinner type="grow" color="primary" />
            </Container>
        }
        else{
            if (this.props.blockExist){
                console.log(this.props.block);
                let block = this.props.block;
                return <Container id="block">
                    <h4>Block {numeral(block.height).format("0,0")}</h4>
                </Container>
            }
            else{
                return <Container id="block"><div>No such block found.</div></Container>
            }
        }
    }
}