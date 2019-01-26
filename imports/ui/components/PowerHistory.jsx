import React from 'react';
import { Card, CardFooter, CardBody, Col, Row } from 'reactstrap';
import momemt from 'moment';
import numeral from 'numeral';
// import { VelocityComponent } from 'velocity-react';

export default class PowerHistory extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        tx : "",
        diff: <span className={"text-"+((props.votingPower - props.prevVotingPower>0)?"success":"danger")+" vp-diff"}>({numeral(props.votingPower - props.prevVotingPower).format("+0,0")})</span>
    }

    Meteor.call('Transactions.findDelegation', this.props.address, this.props.height-2, (err, result) => {
        if (err){
            console.log(err);
        }
        if (result){
            // console.log(result);
            this.setState({
                tx: result.map((msg, i) => <CardFooter key={i} className="text-secondary">
                    {(msg.tx.value.msg && msg.tx.value.msg.length > 0)?msg.tx.value.msg.map((m, j) => {
                        console.log(m);
                        if (m.type == "cosmos-sdk/MsgDelegate"){
                            return <Row key={j}>
                                <Col xs={12} sm={8}>
                                    <Row>
                                        <Col xs={4} sm={3}>Delegator</Col>
                                        <Col xs={8} sm={9} className="address" data-delegator-address={m.value.delegator_addr}>{m.value.delegator_addr}</Col>
                                    </Row>
                                </Col>
                                <Col xs={12} sm={4}>
                                    <Row>
                                        <Col xs={4} sm={6}>Delegation</Col>
                                        <Col xs={8} sm={6}>{numeral(m.value.value.amount).format('0,0')} {m.value.value.denom}</Col>
                                    </Row>
                                </Col>
                            </Row>
                        }
                    }):''}
                    <Row>
                        <Col xs={12} sm={{size:4, offset:8}}>
                            <Row>
                                <Col xs={4} sm={6}>Fee</Col>
                                <Col xs={8} sm={6}>{(msg.tx.value.fee.amount&& msg.tx.value.fee.amount.length>0)?msg.tx.value.fee.amount.map((amount,i)=>{
                                    if (i > 0){
                                        return <span key={i}> ,{amount.amount} {amount.denom}</span>
                                    }
                                    else{
                                        return <span key={i}>{amount.amount} {amount.denom}</span>
                                    }
                                }):'0'}</Col>
                            </Row> 
                        </Col>
                    </Row>
                </CardFooter>)
            })
        }
    });
  }

  render() {
    let changeClass = "";
    switch (this.props.type){
        case 'up':
            changeClass = "fas fa-chevron-circle-up";
            break;
        case 'down':
            changeClass = "fas fa-chevron-circle-down";
            break;
        case 'remove':
            changeClass = "fas fa-minus-circle";
            break;
        default:
            changeClass = "fas fa-plus-circle";
    }
    return (
        <Card className={this.props.type}>
            <CardBody>
            <Row>
                <Col xs={2} className={(this.props.type == 'down' || this.props.type == 'remove')?'text-danger':(this.props.type == 'up'?'text-success':'text-warning')}><i className={changeClass}></i> </Col>
                <Col xs={10} sm={6} ><span className="voting-power">{numeral(this.props.prevVotingPower).format('0,0')}</span> <i className="material-icons text-info">arrow_forward</i> <span className="voting-power">{numeral(this.props.votingPower).format('0,0')}</span> {this.state.diff}</Col>
                <Col xs={{size:10, offset:2}} sm={{offset:0, size:4}} className="text-secondary"><i className="fas fa-cube"></i> {numeral(this.props.height).format('0,0')}<br/><i className="far fa-clock"></i> {momemt(this.props.time).format("D MMM YYYY, h:mm:ssa z")}</Col>
            </Row>
            </CardBody>
            {this.state.tx}
        </Card>
    );
  }
}

