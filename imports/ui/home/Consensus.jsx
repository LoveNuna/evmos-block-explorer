import React, { Component } from 'react';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress } from 'reactstrap';
import moment from 'moment';

export default class Consensus extends Component{
    constructor(props){
        super(props);
        this.state = {
            chainStopped: false,
        }
    }

    componentDidUpdate(prevProps){
        if (prevProps.consensus != this.props.consensus){
            if (this.props.consensus.latestBlockTime){
                // console.log()
                let lastSync = moment(this.props.consensus.latestBlockTime);
                let current = moment();
                let diff = current.diff(lastSync);
                if (diff > 60000){
                    this.setState({
                        chainStopped:true
                    })
                }
                else{
                    this.setState({
                        chainStopped:false
                    })
                }
            }
        }
    }

    render(){
        if (this.props.loading){
            return <div>Loading</div>
        }
        else{
            if (this.props.consensusExist){
                return (
                    <div>
                        {(this.state.chainStopped)?<Card body inverse color="danger">
                                <span>The chain appears to be stopped for <em>{moment(this.props.consensus.latestBlockTime).fromNow(true)}</em>! Feed me with new blocks 😭!</span>             
                        </Card>:''}
                        <Card className="status">
                            <div className="card-header">Consensus State</div>
                            <CardBody>
                            <Row>
                                <Col md={3}><CardSubtitle>Height</CardSubtitle><span className="value">{this.props.consensus.votingHeight}</span></Col>
                                <Col md={9}><CardSubtitle>Voting Power</CardSubtitle><Progress animated value={this.props.consensus.votedPower} className="value">{this.props.consensus.votedPower}%</Progress></Col>
                            </Row>
                            </CardBody>
                        </Card>
                    </div>);
            }
            else{
                return <div><Card body inverse color="danger">
                    <span>The chain haven't started yet.</span>             
                </Card></div>
            }   
        }
    }
}