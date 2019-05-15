import React from 'react';
export default class Avatar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            avatar: "https://ui-avatars.com/api/?rounded=true&size=128&name="+this.props.moniker+"&color=fff&background=aaa"
        }
    }

    componentDidMount(){
    // console.log(this.props.moniker);
    //     console.log(this.getColourHex(this.props.moniker));
        if (this.props.identity != ""){
            if (this.props.identity.length == 16){
                fetch("https://keybase.io/_/api/1.0/user/lookup.json?key_suffix="+this.props.identity+"&fields=pictures")
                    .then(response => response.json())
                    .then(data => {
                        if (data.them && data.them.length > 0){
                            if (data.them[0].pictures){
                                this.setState({avatar:data.them[0].pictures.primary.url});
                            }
                        }
                    });
            }
            else if (this.props.identity.indexOf("keybase.io/team/")>0){
                Meteor.call('getKeybaseTeamPic', this.props.identity, (err, result) => {
                    if (result){
                        this.setState({avatar:result});
                    }
                });
            }
        }
    }

    componentDidUpdate(prevProps){
        if (this.props.moniker != prevProps.moniker){
            if (this.props.identity != ""){
                fetch("https://keybase.io/_/api/1.0/user/lookup.json?key_suffix="+this.props.identity+"&fields=pictures")
                    .then(response => response.json())
                    .then(data => {
                        if (data.them.length > 0){
                            this.setState({avatar:data.them[0].pictures.primary.url});
                        }
                    });
            }
            else{
            // console.log(this.props.moniker);
            // console.log(this.getColourHex(this.props.moniker));
                this.setState({
                    avatar: "https://ui-avatars.com/api/?rounded=true&size=128&name="+this.props.moniker+"&color=fff&background=aaa"
                });
            }
        }
    }

    getColourHex(address){
        // let hex, i;

        // let result = "";
        // let hexString = '1234567890abcde';
        // for (i=0; i<moniker.length; i++) {
        //     hex = moniker.charCodeAt(i).toString(16);
        //     result += hex;
        // }

        // if (result.length < 6){
        //     let tempRes = "";
        //     for (i=0;i<(6-result.length); i++){
        //         tempRes += hexString.charAt(Math.floor((Math.random() * 16)));
        //     }
        //     result += tempRes;
        // }

        return address.substring(0,6);
    }

    render() {
        return (
            <img src={this.state.avatar} alt={this.props.moniker} className={this.props.list?'moniker-avatar-list img-fluid rounded-circle':'img-fluid rounded-circle'} />
        );
    }
}