import React, { Component } from 'react';
import {Line} from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress } from 'reactstrap';
import moment from 'moment';

export default class Chart extends Component{
    constructor(props){
        super(props);
        this.state = {
            data: {
                labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                datasets: [
                  {
                    label: 'My First dataset',
                    fill: false,
                    lineTension: 0.1,
                    backgroundColor: 'rgba(75,192,192,0.4)',
                    borderColor: 'rgba(75,192,192,1)',
                    borderCapStyle: 'butt',
                    borderDash: [],
                    borderDashOffset: 0.0,
                    borderJoinStyle: 'miter',
                    pointBorderColor: 'rgba(75,192,192,1)',
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: 'rgba(75,192,192,1)',
                    pointHoverBorderColor: 'rgba(220,220,220,1)',
                    pointHoverBorderWidth: 2,
                    pointRadius: 1,
                    pointHitRadius: 10,
                    data: [65, 59, 80, 81, 56, 55, 40]
                  }
                ]
              },
              optionsTime: {},
              optionsVP: {}
        }
    }

    componentDidUpdate(prevProps){
        if (prevProps.history != this.props.history){
            let dates = [];
            let heights = [];
            let blockTime = [];
            let timeDiff = [];
            let votingPower = [];
            let validators = [];
            for (let i in this.props.history){
                dates.push(moment.utc(this.props.history[i].time).toString());
                heights.push(this.props.history[i].height);
                blockTime.push((this.props.history[i].averageBlockTime/1000).toFixed(2));
                timeDiff.push((this.props.history[i].timeDiff/1000).toFixed(2));
                votingPower.push(this.props.history[i].voting_power);
                validators.push(this.props.history[i].precommits);
            }
            this.setState({
                vpData:{
                    labels:dates,
                    datasets: [
                        {
                            label: 'Voting Power',
                            fill: false,
                            yAxisID: 'VotingPower',
                            pointRadius: 1,
                            borderColor: 'rgba(255,152,0,0.5)',
                            backgroundColor: 'rgba(255,193,101,0.5)',
                            data: votingPower
                        },
                        {
                            label: 'No. of Validators',
                            fill: false,
                            yAxisID: 'Validators',
                            pointRadius: 1,
                            borderColor: 'rgba(189,28,8,0.5)',
                            backgroundColor: 'rgba(255,103,109,0.5)',
                            data: validators,
                        }
                    ]
                },
                timeData:{
                    labels:dates,
                    datasets: [
                        {
                            label: 'Average Block Time',
                            fill: false,
                            yAxisID: 'Time',
                            pointRadius: 1,
                            borderColor: 'rgba(156,39,176,0.5)',
                            backgroundColor: 'rgba(229,112,249,0.5)',
                            data: blockTime,
                            tooltips: {
                                callbacks: {
                                    label: function(tooltipItem, data) {
                                        var label = data.datasets[tooltipItem.datasetIndex].label || '';
                    
                                        if (label) {
                                            label += ': ';
                                        }
                                        label += tooltipItem.yLabel+'s';
                                        return label;
                                    }
                                }
                            }
                        },
                        {
                            label: 'Block Interveral',
                            fill: false,
                            yAxisID: 'Time',
                            pointRadius: 1,
                            borderColor: 'rgba(189,28,8,0.5)',
                            backgroundColor: 'rgba(255,103,109,0.5)',
                            data: timeDiff,
                            tooltips: {
                                callbacks: {
                                    label: function(tooltipItem, data) {
                                        var label = data.datasets[tooltipItem.datasetIndex].label || '';
                    
                                        if (label) {
                                            label += ': ';
                                        }
                                        label += tooltipItem.yLabel+'s';
                                        return label;
                                    }
                                }
                            }
                        },
                        {
                            label: 'No. of Validators',
                            fill: false,
                            yAxisID: 'Validators',
                            pointRadius: 1,
                            borderColor: 'rgba(255,152,0,0.5)',
                            backgroundColor: 'rgba(255,193,101,0.5)',
                            data: validators
                        }
                    ]
                },
                optionsVP: {
                  scales: {
                    xAxes: [
                        {
                          display: false,
                        }
                      ],
                    yAxes: [{
                      id: 'VotingPower',
                      type: 'linear',
                      position: 'left',
                    }, {
                      id: 'Validators',
                      type: 'linear',
                      position: 'right',
                    }]
                  }
                },
                optionsTime: {
                  scales: {
                    xAxes: [
                        {
                          display: false,
                        }
                      ],
                    yAxes: [{
                      id: 'Validators',
                      type: 'linear',
                      position: 'right',
                    }, {
                        id: 'Time',
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            // Include a dollar sign in the ticks
                            callback: function(value, index, values) {
                                return value+'s';
                            }
                        }
                    }]
                  }
                }
            })
        }
    }

    render(){
        if (this.props.loading){
            return <div>Loading</div>
        }
        else{
            return (
                <div>
                <Card>
                    <div className="card-header">Block Time History</div>
                    <CardBody>
                    <Line data={this.state.timeData} options={this.state.optionsTime}/>
                    </CardBody>
                </Card>
                <Card>
                    <div className="card-header">Voting Power History</div>
                    <CardBody>
                    <Line data={this.state.vpData}  options={this.state.optionsVP}/>
                    </CardBody>
                </Card>
                </div>
            );    
        }
    }
}