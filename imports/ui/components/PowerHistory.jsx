import React from 'react';
import { Card, CardBody, Col, Row } from 'reactstrap';
import momemt from 'moment';
import numeral from 'numeral';

export default class PowerHistory extends React.Component {
  constructor(props) {
    super(props);
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
        <Card body className={this.props.type}>
            <Row>
                <Col xs={2} className={(this.props.type == 'down')?'text-danger':(this.props.type == 'up'?'text-success':'text-warning')}><i className={changeClass}></i></Col>
                <Col xs={10} sm={6} ><span className="voting-power">{numeral(this.props.prevVotingPower).format('0,0')}</span> <i className="material-icons text-info">arrow_forward</i> <span className="voting-power">{numeral(this.props.votingPower).format('0,0')}</span></Col>
                <Col xs={{size:10, offset:2}} sm={{offset:0, size:4}} className="text-secondary"><i className="fas fa-cube"></i> {this.props.height}<br/><i className="far fa-clock"></i> {momemt(this.props.time).format("D MMM YYYY, h:mm:ssa z")}</Col>
            </Row>
        </Card>
    );
  }
}

