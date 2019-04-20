
import React, { Component } from 'react'; 
import GoogleTagManager from '/imports/ui/components/GoogleTagManager.jsx';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom'
import { Container } from 'reactstrap';
import Header from '/imports/ui/components/Header.jsx';
import Footer from '/imports/ui/components/Footer.jsx';
import Home from '/imports/ui/home/Home.jsx';
import Validators from '/imports/ui/validators/ValidatorsList.jsx';
import ValidatorFirstSeen from '/imports/ui/validators/ValidatorFirstSeen.jsx';
import BlocksTable from '/imports/ui/blocks/BlocksTable.jsx';
import Proposals from '/imports/ui/proposals/Proposals.jsx';
import ValidatorDetails from '/imports/ui/validators/ValidatorDetails.jsx';
import Transactions from '/imports/ui/transactions/TransactionsList.jsx';
import Distribution from '/imports/ui/voting-power/Distribution.jsx';
import moment from 'moment';
import SentryBoundary from '/imports/ui/components/SentryBoundary.jsx';
import NotFound from '/imports/ui/pages/NotFound.jsx';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

// import './App.js'


class App extends Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        let lastDay = moment("2019-02-10");
        let now = moment();
        if (now.diff(lastDay) < 0 ){
            toast.error("🐷 Gung Hei Fat Choi! 恭喜發財！");
        }
    }

    render() {
        return(
            <Router>
                <div>
                    {(Meteor.settings.public.gtm)?<GoogleTagManager gtmId={Meteor.settings.public.gtm} />:''}
                    <Header />
                    <Container fluid id="main">
                        <ToastContainer />
                        <SentryBoundary>
                            <Switch>
                                <Route exact path="/" component={Home} />
                                <Route path="/blocks" component={BlocksTable} />
                                <Route path="/transactions" component={Transactions} />
                                <Route path="/validators" exact component={Validators} />
                                <Route path="/validators/unbonding" render={(props) => <Validators {...props} jailed={false} status={1} />} />
                                <Route path="/validators/jailed" render={(props) => <Validators {...props} jailed={true} />} />
                                <Route path="/validators/firstseen" component={ValidatorFirstSeen} />
                                <Route path="/voting-power-distribution" component={Distribution} />
                                <Route path="/(validator|validators)" component={ValidatorDetails} />
                                <Route path="/proposals" component={Proposals} />
                                <Route component={NotFound} />
                            </Switch>
                        </SentryBoundary>
                    </Container>
                    <Footer />
                </div>
            </Router>
        );
    }
}

export default App